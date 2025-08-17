import { useDraft } from "@/hooks/use-draft";

export const QuotesEditor = ({ id }: { id: number }) => {
  const { data: draft } = useDraft(id);
  return <></>;
};
