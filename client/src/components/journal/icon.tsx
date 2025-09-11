export const Entries = () => (
  <svg
    viewBox="0 0 68 67"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
  >
    <rect
      id="svg-rect-1"
      width="38"
      height="31"
      x="15"
      y="0"
      rx="6"
      className="fill-entries-icon"
    />
    <rect
      id="svg-rect-2"
      width="48"
      height="31"
      x="10"
      y="6"
      rx="6"
      className="fill-entries-icon"
    />
    <rect
      id="svg-rect-3"
      width="51"
      height="34"
      x="8.5"
      y="4.5"
      rx="6"
      className="stroke-background"
      strokeWidth="3"
    />
    <rect
      id="svg-rect-4"
      width="60"
      height="50"
      x="4"
      y="13"
      rx="6"
      className="fill-entries-icon"
    />
    <rect
      id="svg-rect-5"
      width="64"
      height="54"
      x="2"
      y="11"
      rx="6"
      className="stroke-background"
      strokeWidth="4"
    />
  </svg>
);

export const Quote = () => (
  <svg
    viewBox="0 0 86.4909 54.5009"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
  >
    <circle
      id="svg-quote-2"
      cx="20.4908981"
      cy="34.5009155"
      r="20"
      className="fill-quote-icon"
    />
    <path
      id="svg-quote-3"
      d="M9.9909 47.5009C9.9909 47.5009 -1.50914 36.5009 4.99089 20.5009C11.4909 4.50094 25.9909 3.00092 25.9909 3.00092"
      className="stroke-quote-icon"
      strokeLinecap="round"
      strokeWidth="6"
    />
    <circle
      id="svg-quote-4"
      cx="66.4908981"
      cy="34.5009155"
      r="20"
      className="fill-quote-icon"
    />
    <path
      id="svg-quote-5"
      d="M55.9909 47.5009C55.9909 47.5009 44.4909 36.5009 50.9909 20.5009C57.4909 4.50094 71.9909 3.00092 71.9909 3.00092"
      className="stroke-quote-icon"
      strokeLinecap="round"
      strokeWidth="6"
    />
  </svg>
);

export const Calendar = () => (
  <svg
    viewBox="0 0 73 63"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
  >
    <rect
      id="svg-calendar-1"
      width="73"
      height="63"
      x="0"
      y="0"
      rx="6"
      className="fill-calendar-icon"
    />
    <rect
      id="svg-calendar-2"
      width="58.4000015"
      height="40"
      x="7"
      y="16"
      rx="2"
      className="fill-background"
    />
    <circle
      id="svg-calendar-3"
      cx="30"
      cy="24"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-4"
      cx="43"
      cy="24"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-5"
      cx="56"
      cy="24"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-6"
      cx="17"
      cy="36"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-7"
      cx="30"
      cy="36"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-8"
      cx="43"
      cy="36"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-12"
      cx="56"
      cy="36"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-9"
      cx="17"
      cy="48"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-10"
      cx="30"
      cy="48"
      r="4"
      className="fill-calendar-icon"
    />
    <circle
      id="svg-calendar-11"
      cx="43"
      cy="48"
      r="4"
      className="fill-calendar-icon"
    />
  </svg>
);

export const Search = () => (
  <svg
    viewBox="0 0 60 60"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
  >
    <g id="search">
      <circle
        id="search-14"
        cx="26"
        cy="27"
        r="17.5"
        className="stroke-foreground"
        strokeWidth="6"
      />
      <path
        id="search-1"
        d="M0 0L16.2789 0"
        className="stroke-foreground"
        strokeLinecap="round"
        strokeWidth="9"
        transform="matrix(0.737154,0.675725,-0.675725,0.737154,39,41)"
      />
    </g>
  </svg>
);

export const More = ({ className = "fill-foreground" }: IconProps) => (
  <svg
    viewBox="0 0 60 60"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
  >
    <g id="more">
      <circle id="more14" cx="10" cy="30" r="6" className={className} />
      <circle id="more15" cx="30" cy="30" r="6" className={className} />
      <circle id="more16" cx="50" cy="30" r="6" className={className} />
    </g>
  </svg>
);

export const MoreArrow = () => (
  <svg
    viewBox="0 0 40 40"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    fill="none"
  >
    <g id="more-arrow">
      <path
        id="more25"
        d="M0 0L15 15.5"
        className="stroke-more-arrow"
        strokeLinecap="round"
        strokeWidth="6"
        transform="matrix(-1,0,0,1,35,12.001)"
      />
      <path
        id="more27"
        d="M5 12L20 27.5"
        className="stroke-more-arrow"
        strokeLinecap="round"
        strokeWidth="6"
      />
    </g>
  </svg>
);

interface IconProps {
  className?: string;
}

export const Icon = ({
  className = "",
  children,
}: IconProps & { children?: React.ReactNode }) => (
  <div className={className}>{children}</div>
);

export const VerticalBar = ({ className }: IconProps) => (
  <div className={"bg-vertical-bar w-[1px] " + className}></div>
);

export const Number = ({
  className = "",
  children,
}: IconProps & { children?: React.ReactNode }) => (
  <div className={"text-foreground font-bold " + className}>{children}</div>
);

export const Description = ({
  className = "",
  children,
}: IconProps & { children?: React.ReactNode }) => (
  <div
    className={
      "text-stats-font mt-1 text-xs leading-none font-medium whitespace-nowrap" +
      className
    }
  >
    {children}
  </div>
);
