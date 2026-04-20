import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FaqAccordion: React.FC<{ items: FaqItem[]; className?: string }> = ({ items, className }) => (
  <Accordion type="single" collapsible className={className}>
    {items.map((item) => (
      <AccordionItem key={item.id} value={item.id} className="border-b border-border/60">
        <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-5">
          {item.question}
        </AccordionTrigger>
        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
          {item.answer}
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);
