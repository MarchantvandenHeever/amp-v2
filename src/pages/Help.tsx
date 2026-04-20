import React from "react";
import { toast } from "sonner";

import { EndUserLayout } from "@/components/layout/EndUserLayout";
import {
  PageHero,
  FacilitatorCard,
  FaqAccordion,
  SupportCtaCard,
  ReportBugCard,
  RightRailPanel,
  type Facilitator,
  type FaqItem,
} from "@/components/cl";

const facilitators: Facilitator[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Change Manager",
    email: "sarah.chen@acmecorp.com",
  },
  {
    id: "2",
    name: "Marcus Webb",
    role: "Adoption Lead",
    email: "marcus.webb@acmecorp.com",
  },
  {
    id: "3",
    name: "Priya Patel",
    role: "Microsoft Copilot Coach",
    email: "priya.patel@acmecorp.com",
  },
  {
    id: "4",
    name: "Diego Alvarez",
    role: "Technical Support",
    email: "diego.alvarez@acmecorp.com",
  },
];

const faqs: FaqItem[] = [
  {
    id: "1",
    question: "What is my adoption score and how is it calculated?",
    answer:
      "Your adoption score combines three dimensions — participation (showing up), ownership (taking initiative), and confidence (feeling capable). The score updates as you complete tasks, attend sessions, and respond to surveys.",
  },
  {
    id: "2",
    question: "How do I complete a task?",
    answer:
      "Open the Individual Workspace, find a task in the To do list, and click it. Some tasks open a survey, others link out to training material or to Microsoft Copilot itself. When you're done, the task moves to Complete automatically.",
  },
  {
    id: "3",
    question: "What happens if I miss a due date?",
    answer:
      "Nothing punitive — the task is just marked overdue and a gentle reminder is sent. Your facilitators will see overdue items and can help you unblock them.",
  },
  {
    id: "4",
    question: "Can I see how my team is doing?",
    answer:
      "Team members can see their own progress. Team leads have access to a Team Workspace tab with anonymised aggregate scores and risk flags for their team.",
  },
  {
    id: "5",
    question: "Where does my data go?",
    answer:
      "Your responses are stored securely and only used to support your adoption journey. Aggregate (not individual) results are shared with your change manager.",
  },
];

const Help: React.FC = () => {
  const handleContact = () => {
    window.location.href = "mailto:support@changelogic.com?subject=Help%20request";
  };

  const handleReportBug = () => {
    toast.success("Bug report opened", {
      description: "Tell us what went wrong and we'll get on it.",
    });
    window.location.href = "mailto:support@changelogic.com?subject=Bug%20report";
  };

  return (
    <EndUserLayout>
      <PageHero
        title="Get help"
        subtitle="Find answers, meet your facilitators, or reach out when you're stuck."
        size="md"
      />

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-16 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6 min-w-0">
            <FacilitatorCard facilitators={facilitators} />

            <section className="cl-card p-6 md:p-7">
              <h3 className="cl-section-label mb-2">Frequently asked questions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Quick answers to the things people ask most.
              </p>
              <FaqAccordion items={faqs} />
            </section>
          </div>

          <aside className="space-y-6">
            <SupportCtaCard
              title="Talk to a real person about your adoption journey."
              ctaLabel="Contact us"
              onCta={handleContact}
            />
            <ReportBugCard
              title="Spotted something broken? Tell us and we'll fix it."
              ctaLabel="Report a bug"
              onCta={handleReportBug}
            />
            <RightRailPanel title="Office hours">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Mon – Thu</span>
                  <span className="font-semibold">9am – 5pm</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Friday</span>
                  <span className="font-semibold">9am – 1pm</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Response time</span>
                  <span className="font-semibold">&lt; 1 business day</span>
                </li>
              </ul>
            </RightRailPanel>
          </aside>
        </div>
      </div>
    </EndUserLayout>
  );
};

export default Help;
