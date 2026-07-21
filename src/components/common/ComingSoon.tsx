import type { ReactNode } from "react";
import { EmptyState } from "../ui/EmptyState";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}
