import type { Flip as FlipClass } from 'gsap/Flip';
import type { ScrollTrigger as ScrollTriggerClass } from 'gsap/ScrollTrigger';
import type { GsapStatic } from '../journey/types';
import { DUR, EASE } from './tokens';

/** Loaded GSAP core and journey plugins. */
export interface MotionBundle {
	gsap: GsapStatic;
	ScrollTrigger: typeof ScrollTriggerClass;
	Flip: typeof FlipClass;
}

let motionPromise: Promise<MotionBundle> | undefined;

/** Load and configure GSAP exactly once for the journey. */
export function loadGsap(): Promise<MotionBundle> {
	if (!motionPromise) {
		motionPromise = Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('gsap/Flip')]).then(
			([core, scrollTriggerModule, flipModule]) => {
				const gsap = core.gsap ?? core.default;
				const ScrollTrigger = scrollTriggerModule.ScrollTrigger ?? scrollTriggerModule.default;
				const Flip = flipModule.Flip ?? flipModule.default;

				gsap.registerPlugin(ScrollTrigger, Flip);
				gsap.defaults({ ease: EASE.out, duration: DUR.beat });
				ScrollTrigger.config({ ignoreMobileResize: true });

				return { gsap, ScrollTrigger, Flip };
			},
		);
	}

	return motionPromise;
}
