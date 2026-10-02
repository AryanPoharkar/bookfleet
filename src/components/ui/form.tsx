import * as React from "react";
import {
  Controller,
  FormProvider,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "cn";

const Form = FormProvider;

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: ControllerProps<TFieldValues, TName>,
) => <Controller {...props} />;

const FormItemContext = React.createContext<{ id: string } | null>(null);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function useFormField() {
  const fieldContext = React.useContext(FormItemContext);

  if (!fieldContext) {
    throw new Error("useFormField must be used inside FormItem.");
  }

  return {
    id: fieldContext.id,
    formItemId: `${fieldContext.id}-form-item`,
    formDescriptionId: `${fieldContext.id}-form-item-description`,
    formMessageId: `${fieldContext.id}-form-item-message`,
  };
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { formItemId } = useFormField();

  return (
    <label
      htmlFor={formItemId}
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

function FormControl({
  children,
}: {
  children: React.ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
}) {
  const { formItemId, formDescriptionId, formMessageId } = useFormField();
  const field = React.Children.only(children);

  return React.cloneElement(field, {
    id: formItemId,
    "aria-describedby": `${formDescriptionId} ${formMessageId}`,
    "aria-invalid": undefined,
  });
}

function FormMessage({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { formMessageId } = useFormField();

  if (!children) {
    return null;
  }

  return (
    <p
      id={formMessageId}
      role="alert"
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
};
