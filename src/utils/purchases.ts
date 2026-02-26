import { Purchases } from '@revenuecat/purchases-capacitor';
import { logger } from './logger';
import { config } from '../config/api';

let isInitialized = false;

/**
 * Initialize RevenueCat
 */
export async function initializePurchases(userId?: string): Promise<void> {
  try {
    if (isInitialized) {
      logger.log('RevenueCat already initialized');
      return;
    }

    if (!config.revenuecat.apiKey) {
      logger.warn('RevenueCat API key not configured');
      return;
    }

    // Initialize RevenueCat
    await Purchases.configure({
      apiKey: config.revenuecat.apiKey,
      appUserID: userId || undefined, // Optional: set user ID if logged in
    });

    isInitialized = true;
    logger.log('RevenueCat initialized');

    // Set user ID if provided
    if (userId) {
      await Purchases.logIn(userId);
    }
  } catch (error) {
    logger.error('Error initializing RevenueCat:', error);
  }
}

/**
 * Get available products/packages
 */
export async function getOfferings() {
  try {
    if (!isInitialized) {
      await initializePurchases();
    }

    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    logger.error('Error getting offerings:', error);
    return null;
  }
}

/**
 * Purchase a product
 */
export async function purchasePackage(packageToPurchase: any) {
  try {
    if (!isInitialized) {
      await initializePurchases();
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    logger.log('Purchase successful:', customerInfo);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      logger.log('User cancelled purchase');
      return null;
    }
    logger.error('Error purchasing package:', error);
    throw error;
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases() {
  try {
    if (!isInitialized) {
      await initializePurchases();
    }

    const customerInfo = await Purchases.restorePurchases();
    logger.log('Purchases restored:', customerInfo);
    return customerInfo;
  } catch (error) {
    logger.error('Error restoring purchases:', error);
    return null;
  }
}

/**
 * Check if user has active subscription/entitlement
 */
export async function checkEntitlement(entitlementId: string): Promise<boolean> {
  try {
    if (!isInitialized) {
      await initializePurchases();
    }

    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  } catch (error) {
    logger.error('Error checking entitlement:', error);
    return false;
  }
}

/**
 * Get customer info
 */
export async function getCustomerInfo() {
  try {
    if (!isInitialized) {
      await initializePurchases();
    }

    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    logger.error('Error getting customer info:', error);
    return null;
  }
}
