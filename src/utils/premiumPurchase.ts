import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';
import { config } from '../config/api';
import { getOfferings, initializePurchases, purchasePackage } from './purchases';

export async function runPremiumPurchase(feature: string): Promise<{ success: boolean; message: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, message: 'Purchases are available on native mobile builds only.' };
  }

  if (!config.revenuecat.apiKey) {
    return { success: false, message: 'RevenueCat API key is missing. Set VITE_REVENUECAT_API_KEY.' };
  }

  try {
    await initializePurchases(auth.currentUser?.uid);

    const offerings = await getOfferings();
    const packages = offerings?.current?.availablePackages || [];
    if (!packages.length) {
      return { success: false, message: 'No in-app purchase packages are configured.' };
    }

    const normalizedFeature = feature.toLowerCase();
    const selectedPackage =
      packages.find((pkg: any) => {
        const identifier = (pkg?.identifier || '').toLowerCase();
        const productIdentifier = (pkg?.product?.identifier || '').toLowerCase();
        return identifier.includes(normalizedFeature) || productIdentifier.includes(normalizedFeature);
      }) || packages[0];

    const customerInfo = await purchasePackage(selectedPackage);
    if (!customerInfo) {
      return { success: false, message: 'Purchase was cancelled.' };
    }

    const entitlementId = config.revenuecat.entitlementId;
    const activeEntitlement = customerInfo.entitlements?.active?.[entitlementId];

    if (feature === 'premium' && !activeEntitlement) {
      return { success: false, message: `Purchase completed but entitlement '${entitlementId}' is not active.` };
    }

    return { success: true, message: 'Purchase completed successfully.' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Purchase failed.' };
  }
}
