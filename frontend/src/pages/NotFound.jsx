import { FileQuestion } from "lucide-react";
import { Button, EmptyState } from "../components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <EmptyState icon={FileQuestion} title="This page doesn't exist" action={<Button to="/">Go home</Button>}>
        The link may be broken, or the page may have been moved.
      </EmptyState>
    </div>
  );
}
