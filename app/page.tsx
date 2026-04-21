"use client";

import dynamic from "next/dynamic";

const FitTrackAI = dynamic(() => import("@/components/FitTrackAI"), {
  ssr: false,
});

export default function Page() {
  return <FitTrackAI />;
}