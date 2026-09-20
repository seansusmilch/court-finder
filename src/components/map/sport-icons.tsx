import type { ReactNode, SVGProps } from 'react';

export type SportIconName =
  | 'basketball'
  | 'tennis'
  | 'soccer'
  | 'baseball'
  | 'track'
  | 'unknown';

type SportIconProps = SVGProps<SVGSVGElement>;

function IconFrame({ children, ...props }: SportIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      focusable='false'
      aria-hidden='true'
      {...props}
    >
      {children}
    </svg>
  );
}

function BasketballIcon(props: SportIconProps) {
  return (
    <IconFrame {...props}>
      <circle cx='12' cy='12' r='8.75' />
      <path d='M8.1 4.2c2.25 2.03 3.4 4.63 3.4 7.8s-1.15 5.77-3.4 7.8' />
      <path d='M15.9 4.2c-2.25 2.03-3.4 4.63-3.4 7.8s1.15 5.77 3.4 7.8' />
      <path d='M3.5 9.3c2.23 1.08 5.06 1.62 8.5 1.62s6.27-.54 8.5-1.62' />
      <path d='M3.5 14.7c2.23-1.08 5.06-1.62 8.5-1.62s6.27.54 8.5 1.62' />
    </IconFrame>
  );
}

function TennisIcon(props: SportIconProps) {
  return (
    <IconFrame {...props}>
      <path d='M7.1 4.3c2.17-2.17 5.65-1.86 7.76.25s2.42 5.59.25 7.76-5.65 2.42-7.76.25-2.42-5.59-.25-7.76Z' />
      <path d='m13.55 13.45 5.25 5.25' />
      <path d='m17.8 17.05 1.15-1.15' />
      <path d='M7.25 5.35c1.24.31 2.43.97 3.42 1.96s1.65 2.18 1.96 3.42' />
      <circle cx='17.65' cy='5.55' r='1.65' />
    </IconFrame>
  );
}

function SoccerIcon(props: SportIconProps) {
  return (
    <IconFrame {...props}>
      <circle cx='12' cy='12' r='8.75' />
      <path d='m12 8.25 2.35 1.7-.9 2.78h-2.9l-.9-2.78L12 8.25Z' />
      <path d='m12 8.25-.15-4.68M9.65 9.95 5.1 8.08M10.55 12.73l-3.23 3.75M13.45 12.73l3.23 3.75M14.35 9.95l4.55-1.87' />
    </IconFrame>
  );
}

function BaseballIcon(props: SportIconProps) {
  return (
    <IconFrame {...props}>
      <circle cx='12' cy='12' r='8.75' />
      <path d='M7.6 4.45c2.63 1.42 4.08 3.94 4.08 7.55s-1.45 6.13-4.08 7.55' />
      <path d='M16.4 4.45c-2.63 1.42-4.08 3.94-4.08 7.55s1.45 6.13 4.08 7.55' />
      <path d='m8.55 6.05.7.35M7.4 8.25l.78.18M7.22 10.7l.8.02M7.48 13.18l.77-.18M8.75 15.45l.67-.35M15.45 6.4l-.7.35M16.6 8.43l-.78.18M16.78 10.72l-.8.02M16.52 13l-.77-.18M15.25 15.1l-.67-.35' />
    </IconFrame>
  );
}

function TrackIcon(props: SportIconProps) {
  return (
    <IconFrame {...props}>
      <ellipse cx='12' cy='12' rx='8.75' ry='6.75' />
      <ellipse cx='12' cy='12' rx='5.65' ry='3.72' />
      <path d='M3.7 12h16.6M5.45 8.8h13.1M5.45 15.2h13.1' />
    </IconFrame>
  );
}

function UnknownIcon(props: SportIconProps) {
  return (
    <IconFrame {...props}>
      <circle cx='12' cy='12' r='8.75' />
      <path d='M9.7 9.5a2.45 2.45 0 1 1 4.38 1.5c-.82.96-2.08 1.2-2.08 2.5' />
      <path d='M12 16.85h.01' />
    </IconFrame>
  );
}

const SPORT_ICON_COMPONENTS: Record<SportIconName, (props: SportIconProps) => ReactNode> = {
  basketball: BasketballIcon,
  tennis: TennisIcon,
  soccer: SoccerIcon,
  baseball: BaseballIcon,
  track: TrackIcon,
  unknown: UnknownIcon,
};

const SPORT_ICON_BY_CLASS: Record<string, SportIconName> = {
  'basketball-court': 'basketball',
  'tennis-court': 'tennis',
  'soccer-ball-field': 'soccer',
  'baseball-diamond': 'baseball',
  'ground-track-field': 'track',
};

export function getSportIconName(courtClass: string): SportIconName {
  return SPORT_ICON_BY_CLASS[courtClass] ?? 'unknown';
}

export function SportIcon({ name, ...props }: SportIconProps & { name: SportIconName }) {
  return SPORT_ICON_COMPONENTS[name](props);
}
