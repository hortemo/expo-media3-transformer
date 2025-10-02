import { requireNativeModule } from 'expo-modules-core';

import type { Media3TransformerModule } from './Media3Transformer.types';

export default requireNativeModule<Media3TransformerModule>('Media3Transformer');
