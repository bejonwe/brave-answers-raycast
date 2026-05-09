import { ActionPanel, Action, List, Detail, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import React, { useEffect, useState, useCallback } from "react";

interface Preferences {
  apiKey: string;
  autosuggestApiKey: string;
}

interface StreamChunk {
  choices: {
    delta: { content?: string };
    finish_reason: string | null;
  }[];
}

interface Citation {
  number: number;
  url: string;
  favicon?: string;
  snippet?: string;
}

interface SuggestionResult {
  type: string;
  value: string;
}

async function fetchSuggestions(query: string, autosuggestApiKey: string): Promise<string[]> {
  if (!query.trim() || !autosuggestApiKey) {
    return [];
  }

  try {
    const url = new URL("https://api.search.brave.com/res/v1/suggest/search");
    url.searchParams.append("q", query);
    url.searchParams.append("count", "5");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Subscription-Token": autosuggestApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Autosuggest API Error ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    const suggestions: string[] = (data?.results || []).map((r: SuggestionResult) => r.value).filter(Boolean);
    return suggestions.filter((s) => s.toLowerCase() !== query.toLowerCase());
  } catch (err) {
    console.error("Error fetching autosuggestions:", err);
    return [];
  }
}
function AnswerDetail({ question, apiKey }: { question: string; apiKey: string }) {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
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
            stream: true,
            enable_citations: true,
            enable_entities: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        if (!response.body) {
          throw new Error("No response body returned from Brave");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let firstChunk = true;
        const collectedCitations: Citation[] = [];

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value, { stream: true }).split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break outer;

            let chunk: StreamChunk;
            try {
              chunk = JSON.parse(payload);
            } catch {
              continue;
            }

            const content = chunk.choices?.[0]?.delta?.content;
            if (content && !cancelled) {
              if (firstChunk) {
                setIsLoading(false);
                firstChunk = false;
              }

              if (content.startsWith("<citation>") && content.endsWith("</citation>")) {
                try {
                  const citation: Citation = JSON.parse(content.slice(10, -11));
                  if (!collectedCitations.some((c) => c.number === citation.number)) {
                    collectedCitations.push(citation);
                    setCitations([...collectedCitations]);
                  }
                  setAnswer((prev) => prev + ` [[${citation.number + 1}]](${citation.url})`);
                } catch {
                  // skip malformed citation
                }
              } else if (content.startsWith("<enum_item>") && content.endsWith("</enum_item>")) {
                try {
                  const item = JSON.parse(content.slice(11, -12));
                  setAnswer((prev) => prev + `[${item.original_tokens}](${item.href})`);
                } catch {
                  setAnswer((prev) => prev + content);
                }
              } else if (content.startsWith("<usage>") && content.endsWith("</usage>")) {
                // ignore usage metadata
              } else {
                setAnswer((prev) => prev + content);
              }
            }
          }
        }

        if (!cancelled) {
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

  const markdown = error
    ? `**Error:** ${error}\n\nPlease check your API key in Raycast preferences.`
    : `# ${question}\n\n${answer}`;

  function getCleanSnippet(snippet: string | undefined): string | undefined {
    if (!snippet) return undefined;
    try {
      const parsed = JSON.parse(snippet);
      return parsed.description ?? parsed.headline ?? parsed.name ?? undefined;
    } catch {
      return snippet;
    }
  }

  const sortedCitations = [...citations].sort((a, b) => a.number - b.number);

  const metadata =
    sortedCitations.length > 0 ? (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Sources" />
        <Detail.Metadata.Separator />
        {sortedCitations.map((c) => {
          const domain = (() => {
            try {
              return new URL(c.url).hostname;
            } catch {
              return c.url;
            }
          })();
          const snippet = getCleanSnippet(c.snippet);
          const faviconIcon = c.favicon ? { source: c.favicon, fallback: Icon.Link } : Icon.Link;
          return (
            <React.Fragment key={c.number}>
              <Detail.Metadata.Label title={`[${c.number + 1}]`} icon={faviconIcon} text={domain} />
              <Detail.Metadata.Link title="" target={c.url} text="Open source ↗" />
              {snippet && <Detail.Metadata.Label title="" text={snippet} />}
              <Detail.Metadata.Separator />
            </React.Fragment>
          );
        })}
      </Detail.Metadata>
    ) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={question}
      metadata={metadata}
      actions={
        <ActionPanel>
          {(answer || error) && <Action.CopyToClipboard title="Copy Answer" content={answer} />}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { apiKey, autosuggestApiKey } = getPreferenceValues<Preferences>();
  const [question, setQuestion] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [debouncedQuestion, setDebouncedQuestion] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuestion(question);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [question]);

  useEffect(() => {
    if (!debouncedQuestion.trim() || !autosuggestApiKey) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);

    fetchSuggestions(debouncedQuestion, autosuggestApiKey).then((result) => {
      if (!cancelled) {
        setSuggestions(result);
        setIsLoadingSuggestions(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuestion, autosuggestApiKey]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuestion(suggestion);
    setSuggestions([]);
  }, []);

  return (
    <List
      searchText={question}
      onSearchTextChange={setQuestion}
      searchBarPlaceholder="Ask Brave a question..."
      throttle={false}
    >
      {question.trim() ? (
        <>
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
          {autosuggestApiKey && suggestions.length > 0 && (
            <List.Section title="Suggestions">
              {suggestions.map((suggestion) => (
                <List.Item
                  key={suggestion}
                  title={suggestion}
                  subtitle="Click to use this suggestion"
                  icon={Icon.LightBulb}
                  actions={
                    <ActionPanel>
                      <Action.Open title="Use Suggestion" onAction={() => handleSuggestionClick(suggestion)} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {autosuggestApiKey && isLoadingSuggestions && question.trim() && (
            <List.Item title="Loading suggestions..." icon={Icon.Clock} />
          )}
        </>
      ) : (
        <List.EmptyView title="Ask Brave a Question" description="Type your question above and press Enter" />
      )}
    </List>
  );
}
