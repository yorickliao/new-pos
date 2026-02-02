'use client';

import { useParams } from 'next/navigation';
import SettingsManager from '@/components/store/SettingsManager';

export default function SettingsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  return <SettingsManager storeId={storeId} />;
}