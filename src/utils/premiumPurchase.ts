import { Capacitor } from '@capacitor/core';
import { getCurrentUid } from '../auth';
import { config } from '../config/api';
import { getOfferings, initializePurchases, purchasePackage } from './purchases';

export async function runPremiumPurchase(feature: string): Promise<{ success: boolean; message: string }> {
  // Web: use Stripe Payment Link if configured
  if (!Capacitor.isNativePlatform()) {
    const paymentLink = config.stripe?.paymentLinkUrl?.trim();
    if (paymentLink) {
      window.open(paymentLink, '_blank', 'noopener,noreferrer');
      return { success: true, message: 'Opened payment page. Complete checkout in the new tab.' };
    }
    return { success: false, message: 'Web purchases: Add VITE_STRIPE_PAYMENT_LINK_URL to .env with your Stripe Payment Link.' };
  }

  if (!config.revenuecat.apiKey) {
    return { success: false, message: 'RevenueCat API key is missing. Set VITE_REVENUECAT_API_KEY.' };
  }

  try {
    await initializePurchases(getCurrentUid());

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
