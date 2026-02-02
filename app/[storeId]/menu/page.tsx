'use client';

import { useParams } from 'next/navigation';
import MenuManager from '@/components/store/MenuManager';

export default function MenuPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  return <MenuManager storeId={storeId} />;
}