import { describe, expect, it } from 'vitest';
import { gsap } from 'gsap';

describe('master timeline seeking', () => {
	it('renders an active child when the paused master is sought', () => {
		const value = { v: 0 };
		const child = gsap.timeline();
		child.to(value, { v: 1, duration: 1, ease: 'none' });

		// Plan rule: the master is the only paused timeline, so active station children render when it is sought.
		const master = gsap.timeline({ paused: true });
		master.add(child);
		master.seek(0.5);

		expect(value.v).toBeCloseTo(0.5, 6);
	});

	it('shows why a paused child contributes nothing to a master', () => {
		const value = { v: 0 };
		const pausedChild = gsap.timeline({ paused: true });
		pausedChild.to(value, { v: 1, duration: 1, ease: 'none' });

		const master = gsap.timeline({ paused: true });
		master.add(pausedChild);
		master.seek(0.5);

		expect(master.duration()).toBe(0);
		expect(value.v).toBe(0);
	});
});
