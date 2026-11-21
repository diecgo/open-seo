import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { useHostedPlanGate } from "@/client/features/billing/HostedPlanGate";
import { BASE_PLAN_OFFER } from "@/client/features/billing/plan-offers";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

export type PaidPlanGateCopy = {
  feature: string;
  description: string;
  features: { icon: LucideIcon; title: string; body: string }[];
  /** A second action that keeps a free user moving, such as a free feature. */
  alternative?: ReactNode;
};

/**
 * Stands in for a feature that needs the paid plan, such as Prompt Explorer
 * and Prompt Research. A UX layer only: the server checks the plan before it
 * spends anything.
 */
export function PaidPlanGate({
  feature,
  description,
  features,
  alternative,
  children,
}: PaidPlanGateCopy & { children: ReactNode }) {
  const planStatus = useHostedPlanGate();
  if (planStatus === "loading") return <SkeletonCard />;
  if (planStatus === "paid") return children;
  return (
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
      <GateCard
        className="max-w-3xl"
        title={`Desbloquea ${feature}`}
        description={
          <>
            <p className="max-w-xl">{description}</p>
            <p className="max-w-xl">
              Funciona con datos de IA más caros, así que forma parte del{" "}
              {BASE_PLAN_OFFER.name}: ${BASE_PLAN_OFFER.priceUsd} al mes, con $
              {BASE_PLAN_OFFER.monthlyCreditsUsd} en créditos de uso incluidos.
            </p>
          </>
        }
        actions={
          <>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link to={SUBSCRIBE_ROUTE} search={{ upgrade: true }} />}
            >
              Ver plan
            </Button>
            {alternative}
          </>
        }
        features={features}
      />
    </div>
  );
}
