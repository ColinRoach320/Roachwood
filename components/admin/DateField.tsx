import * as React from "react";
import { Input } from "@/components/ui/Input";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

/**
 * Native `<input type="date">` styled for the dark theme. Modern
 * browsers render a calendar popup for `type=date` automatically
 * (Chrome, Edge, Safari, Firefox), accept manual typing in
 * YYYY-MM-DD, and post the value as the same string the action
 * already expects. Zero added dependencies.
 *
 * The `colorScheme: dark` style flips the native picker UI (popup
 * background, arrows, highlighted day) into dark mode so the calendar
 * matches the rest of the form instead of flashing a white panel.
 */
export const DateField = React.forwardRef<HTMLInputElement, Props>(
  ({ style, ...rest }, ref) => (
    <Input
      ref={ref}
      type="date"
      style={{ colorScheme: "dark", ...style }}
      {...rest}
    />
  ),
);
DateField.displayName = "DateField";
