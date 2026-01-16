/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE DESIGN SYSTEM — Core Components
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "Perfection is achieved, not when there is nothing more to add,
 *  but when there is nothing left to take away." — Antoine de Saint-Exupéry
 *
 * Atomic components built on our design tokens. Every component:
 * - Uses tokens exclusively (no magic numbers)
 * - Supports variants through composition
 * - Animates with intention
 * - Accessible by default
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { forwardRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { colors, typography, spacing, radius, shadows, animation } from "./tokens";

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON — Primary interaction element
// ═══════════════════════════════════════════════════════════════════════════════

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const buttonStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: colors.gold[400],
    color: colors.bg.void,
    border: "none",
  },
  secondary: {
    background: colors.bg.elevated,
    color: colors.text.primary,
    border: `1px solid ${colors.border.default}`,
  },
  ghost: {
    background: "transparent",
    color: colors.text.secondary,
    border: "none",
  },
  danger: {
    background: colors.state.error,
    color: colors.text.primary,
    border: "none",
  },
};

const buttonSizes: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    height: spacing[9],
  },
  md: {
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.base,
    height: spacing[11],
  },
  lg: {
    padding: `${spacing[4]} ${spacing[8]}`,
    fontSize: typography.fontSize.md,
    height: spacing[14],
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        whileHover={isDisabled ? undefined : { scale: 1.02, y: -1 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", ...animation.spring.snappy }}
        style={{
          ...buttonStyles[variant],
          ...buttonSizes[size],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing[2],
          borderRadius: radius.lg,
          fontFamily: typography.fontFamily.sans,
          fontWeight: typography.fontWeight.semibold,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.5 : 1,
          width: fullWidth ? "100%" : "auto",
          transition: `background ${animation.duration.fast} ${animation.easing.easeOut}`,
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <LoadingSpinner size={size === "sm" ? 14 : size === "md" ? 16 : 20} />
        ) : (
          <>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </>
        )}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD — Container component
// ═══════════════════════════════════════════════════════════════════════════════

type CardVariant = "default" | "elevated" | "glass" | "outlined";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: CardVariant;
  interactive?: boolean;
  padding?: keyof typeof spacing;
  glow?: boolean;
  glowColor?: string;
}

const cardStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
  },
  elevated: {
    background: colors.bg.overlay,
    border: `1px solid ${colors.border.subtle}`,
    boxShadow: shadows.lg,
  },
  glass: {
    background: colors.glass.medium,
    border: `1px solid ${colors.border.subtle}`,
    backdropFilter: "blur(12px)",
  },
  outlined: {
    background: "transparent",
    border: `1px solid ${colors.border.default}`,
  },
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      interactive = false,
      padding = 6,
      glow = false,
      glowColor = colors.gold.glow,
      children,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { scale: 1.01, y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.995 } : undefined}
        transition={{ type: "spring", ...animation.spring.smooth }}
        style={{
          ...cardStyles[variant],
          padding: spacing[padding],
          borderRadius: radius["2xl"],
          boxShadow: glow ? `${shadows.md}, 0 0 30px ${glowColor}` : cardStyles[variant].boxShadow,
          cursor: interactive ? "pointer" : "default",
          ...style,
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT — Text input component
// ═══════════════════════════════════════════════════════════════════════════════

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
  error?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const inputSizes: Record<string, React.CSSProperties> = {
  sm: {
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    height: spacing[9],
  },
  md: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    height: spacing[11],
  },
  lg: {
    padding: `${spacing[4]} ${spacing[5]}`,
    fontSize: typography.fontSize.md,
    height: spacing[14],
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = "md", error = false, icon, iconPosition = "left", style, ...props }, ref) => {
    const hasIcon = !!icon;
    const paddingWithIcon = hasIcon
      ? iconPosition === "left"
        ? { paddingLeft: spacing[10] }
        : { paddingRight: spacing[10] }
      : {};

    return (
      <div style={{ position: "relative", width: "100%" }}>
        {icon && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              [iconPosition]: spacing[3],
              color: colors.text.muted,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            {icon}
          </div>
        )}
        <input
          ref={ref}
          style={{
            ...inputSizes[size],
            ...paddingWithIcon,
            width: "100%",
            background: colors.bg.base,
            border: `1px solid ${error ? colors.state.error : colors.border.default}`,
            borderRadius: radius.lg,
            color: colors.text.primary,
            fontFamily: typography.fontFamily.sans,
            outline: "none",
            transition: `all ${animation.duration.fast} ${animation.easing.easeOut}`,
            boxSizing: "border-box",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? colors.state.error : colors.gold[400];
            e.currentTarget.style.boxShadow = error ? shadows.glow.error : shadows.glow.gold;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? colors.state.error : colors.border.default;
            e.currentTarget.style.boxShadow = "none";
          }}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

// ═══════════════════════════════════════════════════════════════════════════════
// TEXTAREA — Multi-line input
// ═══════════════════════════════════════════════════════════════════════════════

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, style, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        style={{
          width: "100%",
          minHeight: spacing[32],
          padding: spacing[4],
          background: colors.bg.base,
          border: `1px solid ${error ? colors.state.error : colors.border.default}`,
          borderRadius: radius.lg,
          color: colors.text.primary,
          fontFamily: typography.fontFamily.sans,
          fontSize: typography.fontSize.base,
          lineHeight: typography.lineHeight.relaxed,
          outline: "none",
          resize: "vertical",
          transition: `all ${animation.duration.fast} ${animation.easing.easeOut}`,
          boxSizing: "border-box",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? colors.state.error : colors.gold[400];
          e.currentTarget.style.boxShadow = error ? shadows.glow.error : shadows.glow.gold;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? colors.state.error : colors.border.default;
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE — Status indicators
// ═══════════════════════════════════════════════════════════════════════════════

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "gold";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

const badgeColors: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: colors.bg.hover, text: colors.text.secondary, dot: colors.text.muted },
  success: { bg: colors.state.successMuted, text: colors.state.success, dot: colors.state.success },
  warning: { bg: colors.state.warningMuted, text: colors.state.warning, dot: colors.state.warning },
  error: { bg: colors.state.errorMuted, text: colors.state.error, dot: colors.state.error },
  info: { bg: colors.state.infoMuted, text: colors.state.info, dot: colors.state.info },
  gold: { bg: colors.gold.glow, text: colors.gold[400], dot: colors.gold[400] },
};

export function Badge({ variant = "default", children, dot = false, pulse = false }: BadgeProps) {
  const colors = badgeColors[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing[1.5],
        padding: `${spacing[1]} ${spacing[2.5]}`,
        background: colors.bg,
        color: colors.text,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        borderRadius: radius.full,
        fontFamily: typography.fontFamily.sans,
      }}
    >
      {dot && (
        <motion.span
          animate={pulse ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : undefined}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: radius.full,
            background: colors.dot,
          }}
        />
      )}
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR — Profile images with presence
// ═══════════════════════════════════════════════════════════════════════════════

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type PresenceStatus = "online" | "busy" | "away" | "offline";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  fallback?: string;
  presence?: PresenceStatus;
  glow?: boolean;
  glowColor?: string;
}

const avatarSizes: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  "2xl": 120,
};

const presenceColors: Record<PresenceStatus, string> = {
  online: colors.state.success,
  busy: colors.state.error,
  away: colors.state.warning,
  offline: colors.state.idle,
};

export function Avatar({
  src,
  alt,
  size = "md",
  fallback,
  presence,
  glow = false,
  glowColor = colors.gold.glow,
}: AvatarProps) {
  const sizeValue = avatarSizes[size];
  const presenceSize = Math.max(8, sizeValue * 0.2);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          width: sizeValue,
          height: sizeValue,
          borderRadius: radius.full,
          overflow: "hidden",
          background: colors.bg.hover,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: glow ? `0 0 20px ${glowColor}` : undefined,
          border: `2px solid ${colors.border.subtle}`,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            style={{
              color: colors.text.muted,
              fontSize: sizeValue * 0.4,
              fontWeight: typography.fontWeight.semibold,
              fontFamily: typography.fontFamily.sans,
            }}
          >
            {fallback?.charAt(0).toUpperCase() || "?"}
          </span>
        )}
      </div>
      {presence && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: presenceSize,
            height: presenceSize,
            borderRadius: radius.full,
            background: presenceColors[presence],
            border: `2px solid ${colors.bg.elevated}`,
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SPINNER — Activity indicator
// ═══════════════════════════════════════════════════════════════════════════════

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export function LoadingSpinner({ size = 20, color = "currentColor" }: LoadingSpinnerProps) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        borderRadius: radius.full,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON — Loading placeholder
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = "20px",
  borderRadius = radius.md,
  style,
}: SkeletonProps) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      style={{
        width,
        height,
        borderRadius,
        background: colors.bg.hover,
        ...style,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVIDER — Visual separator
// ═══════════════════════════════════════════════════════════════════════════════

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  spacing?: keyof typeof spacing;
}

export function Divider({ orientation = "horizontal", spacing: spacingValue = 4 }: DividerProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      style={{
        width: isHorizontal ? "100%" : "1px",
        height: isHorizontal ? "1px" : "100%",
        background: colors.border.subtle,
        margin: isHorizontal ? `${spacing[spacingValue]} 0` : `0 ${spacing[spacingValue]}`,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICON BUTTON — Compact action button
// ═══════════════════════════════════════════════════════════════════════════════

interface IconButtonProps extends Omit<HTMLMotionProps<"button">, "size"> {
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "filled" | "outlined";
  children: ReactNode;
}

const iconButtonSizes: Record<string, { size: string; iconSize: number }> = {
  sm: { size: spacing[8], iconSize: 16 },
  md: { size: spacing[10], iconSize: 20 },
  lg: { size: spacing[12], iconSize: 24 },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = "md", variant = "ghost", children, disabled, style, ...props }, ref) => {
    const sizeValues = iconButtonSizes[size];

    const variantStyles: Record<string, React.CSSProperties> = {
      ghost: {
        background: "transparent",
        border: "none",
      },
      filled: {
        background: colors.bg.hover,
        border: "none",
      },
      outlined: {
        background: "transparent",
        border: `1px solid ${colors.border.default}`,
      },
    };

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.1, background: colors.bg.hover }}
        whileTap={disabled ? undefined : { scale: 0.9 }}
        transition={{ type: "spring", ...animation.spring.snappy }}
        style={{
          ...variantStyles[variant],
          width: sizeValues.size,
          height: sizeValues.size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.lg,
          color: colors.text.secondary,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          ...style,
        }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
IconButton.displayName = "IconButton";

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS — Progress indicator
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gold" | "success" | "info";
  showLabel?: boolean;
  animated?: boolean;
}

const progressSizes: Record<string, string> = {
  sm: spacing[1],
  md: spacing[2],
  lg: spacing[3],
};

const progressColors: Record<string, string> = {
  default: colors.text.secondary,
  gold: colors.gold[400],
  success: colors.state.success,
  info: colors.state.info,
};

export function Progress({
  value,
  max = 100,
  size = "md",
  variant = "gold",
  showLabel = false,
  animated = true,
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          width: "100%",
          height: progressSizes[size],
          background: colors.bg.hover,
          borderRadius: radius.full,
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={animated ? { width: 0 } : undefined}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", ...animation.spring.smooth }}
          style={{
            height: "100%",
            background: progressColors[variant],
            borderRadius: radius.full,
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            display: "block",
            marginTop: spacing[2],
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            textAlign: "right",
          }}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLTIP — Contextual information
// ═══════════════════════════════════════════════════════════════════════════════

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: spacing[2] },
    bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: spacing[2] },
    left: { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: spacing[2] },
    right: { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: spacing[2] },
  };

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
        transition={{ duration: 0.15 }}
        style={{
          position: "absolute",
          ...positionStyles[position],
          padding: `${spacing[2]} ${spacing[3]}`,
          background: colors.bg.overlay,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.md,
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 700,
        }}
      >
        {content}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  CardProps,
  CardVariant,
  InputProps,
  TextareaProps,
  BadgeProps,
  BadgeVariant,
  AvatarProps,
  AvatarSize,
  PresenceStatus,
  LoadingSpinnerProps,
  SkeletonProps,
  DividerProps,
  IconButtonProps,
  ProgressProps,
  TooltipProps,
};
