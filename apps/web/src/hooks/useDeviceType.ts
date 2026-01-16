'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * useDeviceType - Steve Jobs Level Device Detection
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Responsive breakpoint detection for mobile-first design.
 * Uses ResizeObserver for efficient viewport monitoring.
 */

import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DeviceInfo {
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
  isTouch: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Breakpoints aligned with Tailwind defaults
const BREAKPOINTS = {
  mobile: 640,  // < 640px = mobile
  tablet: 1024, // 640px - 1024px = tablet
  // >= 1024px = desktop
};

/**
 * Get device type from window width
 */
function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

/**
 * Check if device supports touch
 */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get CSS safe area insets
 */
function getSafeAreaInsets(): DeviceInfo['safeAreaInsets'] {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10) || 0,
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10) || 0,
    left: parseInt(style.getPropertyValue('--sal') || '0', 10) || 0,
    right: parseInt(style.getPropertyValue('--sar') || '0', 10) || 0,
  };
}

/**
 * useDeviceType Hook
 *
 * Returns comprehensive device information for responsive design.
 * Updates on resize and orientation change.
 */
export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    // SSR-safe default
    if (typeof window === 'undefined') {
      return {
        type: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
        isLandscape: true,
        isTouch: false,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const type = getDeviceType(width);

    return {
      type,
      isMobile: type === 'mobile',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
      width,
      height,
      isLandscape: width > height,
      isTouch: isTouchDevice(),
      safeAreaInsets: getSafeAreaInsets(),
    };
  });

  const updateDeviceInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const type = getDeviceType(width);

    setDeviceInfo({
      type,
      isMobile: type === 'mobile',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
      width,
      height,
      isLandscape: width > height,
      isTouch: isTouchDevice(),
      safeAreaInsets: getSafeAreaInsets(),
    });
  }, []);

  useEffect(() => {
    // Initial update
    updateDeviceInfo();

    // Listen for resize
    window.addEventListener('resize', updateDeviceInfo);

    // Listen for orientation change on mobile
    window.addEventListener('orientationchange', updateDeviceInfo);

    // Set CSS custom properties for safe areas
    const root = document.documentElement;
    root.style.setProperty('--sat', 'env(safe-area-inset-top)');
    root.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--sal', 'env(safe-area-inset-left)');
    root.style.setProperty('--sar', 'env(safe-area-inset-right)');

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, [updateDeviceInfo]);

  return deviceInfo;
}

/**
 * useIsMobile - Simple mobile check
 */
export function useIsMobile(): boolean {
  const { isMobile } = useDeviceType();
  return isMobile;
}

/**
 * useTouchDevice - Check for touch support
 */
export function useTouchDevice(): boolean {
  const { isTouch } = useDeviceType();
  return isTouch;
}

export default useDeviceType;
