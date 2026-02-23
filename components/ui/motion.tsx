/**
 * Motion Components
 * Subtle animations using Framer Motion
 */

"use client";

import { motion, AnimatePresence, type Easing } from "framer-motion";
import type { ReactNode } from "react";

// ============================================================================
// VARIANTS
// ============================================================================

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

const easeOut: Easing = "easeOut";

export const transitions = {
  fast: { duration: 0.15, ease: easeOut },
  normal: { duration: 0.2, ease: easeOut },
  slow: { duration: 0.3, ease: easeOut },
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface MotionWrapperProps {
  children: ReactNode;
  variant?: keyof typeof variants;
  delay?: number;
  className?: string;
}

const variants = {
  fadeInUp,
  fadeIn,
  scaleIn,
  slideInLeft,
};

/**
 * MotionWrapper - Subtle fade in animation
 */
export function MotionWrapper({
  children,
  variant = "fadeInUp",
  delay = 0,
  className,
}: MotionWrapperProps): React.JSX.Element {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[variant]}
      transition={{ ...transitions.normal, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

/**
 * StaggerList - Staggered list animation
 */
export function StaggerList({ children, className }: StaggerListProps): React.JSX.Element {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * StaggerItem - Item within staggered list
 */
export function StaggerItem({ children, className }: StaggerItemProps): React.JSX.Element {
  return (
    <motion.div variants={fadeInUp} transition={transitions.fast} className={className}>
      {children}
    </motion.div>
  );
}

interface AnimatedPresenceProps {
  children: ReactNode;
  show: boolean;
}

/**
 * AnimatedPresence - Conditional render with animation
 */
export function AnimatedPresence({ children, show }: AnimatedPresenceProps): React.JSX.Element {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={fadeIn}
          transition={transitions.fast}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export { useAnimation, useInView } from "framer-motion";
