import { notFound, redirect } from "next/navigation";
import { getFormBySlug } from "@/lib/db";
import PublicFormPage from "@/app/f/[slug]/page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const RESERVED = ["app", "api", "auth", "f", "favicon.ico"];

export default async function DynamicSlugPage({ params }: PageProps) {
  const { slug } = await params;
  if (RESERVED.includes(slug)) {
    notFound();
  }

  const form = await getFormBySlug(slug);
  if (!form) {
    notFound();
  }

  return <PublicFormPage params={params} />;
}
