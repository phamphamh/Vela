"use client"

import { useState } from "react"

type FaqItem = {
  question: string
  answer: string
}

const ITEMS: FaqItem[] = [
  {
    question: "Can the agent break my prod?",
    answer:
      "No. Everything goes through a review-gated pull request, behind a feature flag. Nothing reaches prod unless you merge. And the flag enables an instant rollback if needed.",
  },
  {
    question: "Is it my code, or a third-party layer on top?",
    answer:
      "Your code. The agent writes in your repo, in your framework and your design system. No injected third-party script, no no-code layer to maintain, no added weight on your page.",
  },
  {
    question: "Which frameworks are supported?",
    answer:
      "Modern JS/TS stacks: Next.js, React, Vue, Astro, SvelteKit, Remix. If your landing lives in a Git repo, the agent can work on it. We help you connect during onboarding.",
  },
  {
    question: "How long before I see results?",
    answer:
      "The first test ships within a few days of connecting. Time to a winning variant depends on your traffic — on average ~11 days to reach significance across our customers.",
  },
  {
    question: "What GitHub permissions do you ask for?",
    answer:
      "Only the essentials: reading the repo and creating pull requests on branches. No direct writes to main. Revocable in one click from your GitHub settings anytime.",
  },
]

export function Faq() {
  // Single-open accordion; item 0 open on load.
  const [open, setOpen] = useState(0)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {ITEMS.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={item.question}
            className={i < ITEMS.length - 1 ? "border-b border-border" : ""}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-[18px] text-left text-[15.5px] font-medium text-foreground"
            >
              <span>{item.question}</span>
              <span
                aria-hidden
                className="flex-none text-[20px] leading-none text-muted-foreground transition-transform duration-200 motion-reduce:transition-none"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            {isOpen ? (
              <div className="max-w-[620px] px-5 pb-5 text-[14.5px] leading-relaxed text-muted-foreground">
                {item.answer}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
