import { Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function Command() {
  const { data, isLoading } = useAI("Suggest 5 jazz songs"); //TODO: Replace with call to brave ai api

  return <Detail isLoading={isLoading} markdown={data} />;
}