/** One shared speed level; higher levels rotate faster. No color string is a sentinel. */
export const rainbowDurations=[32,16,8,4,2] as const;
export function rainbowDuration(level:unknown):number{if(typeof level!=='number'||!Number.isInteger(level)||level<1||level>5)throw Error('Rainbow speed must be an integer from 1 to 5');return rainbowDurations[level-1];}
export const rainbowCss=`@property --mg-rainbow-hue{syntax:"<number>";inherits:true;initial-value:270} @keyframes mg-rainbow-cycle{from{--mg-rainbow-hue:0}to{--mg-rainbow-hue:360}} :root{animation:mg-rainbow-cycle var(--mg-rainbow-duration,8s) linear infinite} :root[data-motion="off"]{animation:none;--mg-rainbow-hue:270} @media(prefers-reduced-motion:reduce){:root{animation:none;--mg-rainbow-hue:270}}`;
