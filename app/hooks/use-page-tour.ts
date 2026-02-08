'use client';

import { useEffect, useRef, useCallback } from 'react';
import { driver, DriveStep, Driver } from 'driver.js';
import { driverConfig } from '@/lib/tour/driver-config';
import {
	isPageTourCompleted,
	completePageTour,
} from '@/lib/tour/tour-state';
import 'driver.js/dist/driver.css';

interface UsePageTourOptions {
	page: string;
	steps: DriveStep[];
	autoStart?: boolean;
	delay?: number;
}

interface UsePageTourReturn {
	startTour: () => void;
}

export function usePageTour({
	page,
	steps,
	autoStart = true,
	delay = 1500,
}: UsePageTourOptions): UsePageTourReturn {
	const driverRef = useRef<Driver | null>(null);

	const startTour = useCallback(() => {
		// Filter steps to only those whose elements exist in the DOM
		const availableSteps = steps.filter((step) => {
			if (!step.element) return true;
			return document.querySelector(step.element as string) !== null;
		});

		if (availableSteps.length === 0) return;

		const driverObj = driver({
			...driverConfig,
			steps: availableSteps,
			onDestroyStarted: () => {
				if (driverObj.isLastStep() || !driverObj.hasNextStep()) {
					completePageTour(page);
				}
				driverObj.destroy();
			},
		});

		driverRef.current = driverObj;
		driverObj.drive();
	}, [page, steps]);

	// Auto-start on first visit
	useEffect(() => {
		if (!autoStart) return;
		if (isPageTourCompleted(page)) return;

		const timer = setTimeout(() => {
			startTour();
		}, delay);

		return () => clearTimeout(timer);
	}, [autoStart, page, delay, startTour]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			driverRef.current?.destroy();
		};
	}, []);

	return { startTour };
}
