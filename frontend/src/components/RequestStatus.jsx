import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "./ui";

const STATUS = {
  pending: { tone: "accent", label: "Waiting for review", icon: Clock },
  approved: { tone: "success", label: "Published", icon: CheckCircle2 },
  rejected: { tone: "danger", label: "Not accepted", icon: XCircle },
};

export default function RequestStatus({ status }) {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <Badge tone={s.tone} className="shrink-0 whitespace-nowrap">
      <Icon className="size-3.5" aria-hidden /> {s.label}
    </Badge>
  );
}
