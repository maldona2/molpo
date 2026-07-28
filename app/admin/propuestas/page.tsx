import type { Metadata } from "next";
import ProposalAdmin from "./ProposalAdmin";

export const metadata: Metadata = {
  title: "Propuestas",
  description: "Generador privado de propuestas de molpo.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PropuestasAdminPage() {
  return <ProposalAdmin />;
}
