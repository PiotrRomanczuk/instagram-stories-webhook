'use client';

import { useEffect, useState } from 'react';
import { driver, DriveStep, Driver } from 'driver.js';
import { driverConfig } from '@/lib/tour/driver-config';
import { adminTourSteps, adminFailedPostsStep } from '@/lib/tour/admin-tour';
import { userTourSteps, userSubmissionCardStep } from '@/lib/tour/user-tour';
import { shouldShowTour, completeTour, getTourStatus, TourStatus } from '@/lib/tour/tour-state';
import 'driver.js/dist/driver.css';

export type UserRole = 'admin' | 'user' | 'developer';

interface UseTourOptions {
	role: UserRole;
	autoStart?: boolean;
	hasFailedPosts?: boolean;
	hasSubmissions?: boolean;
}

interface UseTourReturn {
	startTour: () => void;
	tourStatus: TourStatus | null;
	isLoading: boolean;
}

export function useTour({
	role,
	autoStart = true,
	hasFailedPosts = false,
	hasSubmissions = false,
}: UseTourOptions): UseTourReturn {
	const [tourStatus, setTourStatus] = useState<TourStatus | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [driverInstance, setDriverInstance] = useState<Driver | null>(null);

	// Fetch tour status on mount
	useEffect(() => {
		async function fetchStatus() {
			const status = await getTourStatus();
			setTourStatus(status);
			setIsLoading(false);
		}
		fetchStatus();
	}, []);

	// Function to start the tour
	const startTour = () => {
		// Build steps based on role and conditions
		let steps: DriveStep[] = [];

		if (role === 'admin' || role === 'developer') {
			steps = [...adminTourSteps];
			// Insert failed posts step after schedule step if there are failures
			if (hasFailedPosts) {
				const scheduleStepIndex = steps.findIndex((step) =>
					step.element?.toString().includes('admin-action-schedule')
				);
				if (scheduleStepIndex !== -1) {
					steps.splice(scheduleStepIndex + 1, 0, adminFailedPostsStep);
				}
			}
		} else {
			steps = [...userTourSteps];
			// Insert submission card step after recent submissions if user has submissions
			if (hasSubmissions) {
				const recentIndex = steps.findIndex((step) =>
					step.element?.toString().includes('user-recent-submissions')
				);
				if (recentIndex !== -1) {
					steps.splice(recentIndex + 1, 0, userSubmissionCardStep);
				}
			}
		}

		// Create driver instance
		const driverObj = driver({
			...driverConfig,
			steps,
			onDestroyStarted: () => {
				// Save completion when tour is finished (not skipped)
				if (driverObj.isLastStep() || !driverObj.hasNextStep()) {
					completeTour().then(() => {
						setTourStatus({
							tourCompleted: true,
							tourVersion: 1,
							lastTourDate: new Date().toISOString(),
						});
					});
				}
				driverObj.destroy();
			},
		});

		setDriverInstance(driverObj);
		driverObj.drive();
	};

	// Auto-start tour if conditions are met
	useEffect(() => {
		if (!isLoading && autoStart && tourStatus !== null) {
			if (shouldShowTour(tourStatus)) {
				// Delay to ensure DOM is ready
				const timer = setTimeout(() => {
					startTour();
				}, 1000);
				return () => clearTimeout(timer);
			}
		}
	}, [isLoading, autoStart, tourStatus]);

	return {
		startTour,
		tourStatus,
		isLoading,
	};
}
