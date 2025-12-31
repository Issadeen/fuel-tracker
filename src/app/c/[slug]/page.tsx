import { getCompanyBySlug } from '@/lib/db';
import Dashboard from '@/components/dashboard';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  
  if (!company) {
    notFound();
  }
  
  return <Dashboard companyId={company.id} companyName={company.name} isManager={true} />;
}
