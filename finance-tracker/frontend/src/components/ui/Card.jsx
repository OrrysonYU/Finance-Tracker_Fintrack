export function Card({ children, className = "", as: Component = "div", ...props }) {
  return (
    <Component className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`ui-card__header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", as: Heading = "h2", ...props }) {
  return (
    <Heading className={`ui-card__title ${className}`.trim()} {...props}>
      {children}
    </Heading>
  );
}

export function CardDescription({ children, className = "", ...props }) {
  return (
    <p className={`ui-card__description ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`ui-card__content ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`ui-card__footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
