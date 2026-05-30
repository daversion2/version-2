import React from 'react';
import { FunFactButton } from '../../../components/home/FunFactButton';
import { HomeSectionProps } from './types';

export const FunFactSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  if (!data.funFact) return null;
  return <FunFactButton onPress={() => callbacks.onNavigate('__funFactModal')} />;
});
