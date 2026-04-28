import { ActionPanel, Action, List, Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey: string;
}

interface APIResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

function AnswerDetail({ question, apiKey }: { question: string; apiKey: string }) {
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnswer() {
      try {
        const response = await fetch("https://api.search.brave.com/res/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Subscription-Token": apiKey,
          },
          body: JSON.stringify({
            model: "brave",
            messages: [{ role: "user", content: question }],
            stream: false,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data: APIResponse = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("No answer returned from Brave");
        }

        if (!cancelled) {
          setAnswer(content);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "An unknown error occurred";
          setError(message);
          setIsLoading(false);
          await showToast({ style: Toast.Style.Failure, title: "Brave API Error", message });
        }
      }
    }

    fetchAnswer();

    return () => {
      cancelled = true;
    };
  }, [question, apiKey]);

  const markdown = error ? `**Error:** ${error}\n\nPlease check your API key in Raycast preferences.` : answer;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={question}
      actions={<ActionPanel>{answer && <Action.CopyToClipboard title="Copy Answer" content={answer} />}</ActionPanel>}
    />
  );
}

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [question, setQuestion] = useState("");

  return (
    <List
      searchText={question}
      onSearchTextChange={setQuestion}
      searchBarPlaceholder="Ask Brave a question..."
      throttle={false}
    >
      {question.trim() ? (
        <List.Item
          title={question}
          subtitle="Press Enter to ask Brave"
          icon={{ source: "extension-icon.png" }}
          actions={
            <ActionPanel>
              <Action.Push title="Ask Brave" target={<AnswerDetail question={question.trim()} apiKey={apiKey} />} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title="Ask Brave a Question" description="Type your question above and press Enter" />
      )}
    </List>
  );
}
