'use client';

import { useState } from 'react';
import { format, addHours, setHours, setMinutes, startOfDay } from 'date-fns';
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Calendar } from '@/app/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/app/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface ScheduleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (scheduledTime: number) => Promise<void>;
	needsApproval?: boolean;
	itemTitle?: string;
}

type ScheduleMode = 'specific' | 'queue';

export function ScheduleDialog({
	open,
	onOpenChange,
	onConfirm,
	needsApproval = false,
	itemTitle,
}: ScheduleDialogProps) {
	const [mode, setMode] = useState<ScheduleMode>('specific');
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [hour, setHour] = useState('12');
	const [minute, setMinute] = useState('00');
	const [queueInterval, setQueueInterval] = useState('4');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const getScheduledTime = (): number => {
		if (mode === 'queue') {
			// Queue mode: schedule X hours from now
			return addHours(new Date(), parseInt(queueInterval)).getTime();
		}

		if (!date) {
			throw new Error('Please select a date');
		}

		// Specific mode: use selected date and time
		const scheduledDate = setMinutes(
			setHours(startOfDay(date), parseInt(hour)),
			parseInt(minute)
		);
		return scheduledDate.getTime();
	};

	const handleConfirm = async () => {
		setError(null);

		try {
			const scheduledTime = getScheduledTime();

			if (scheduledTime <= Date.now()) {
				setError('Scheduled time must be in the future');
				return;
			}

			setIsSubmitting(true);
			await onConfirm(scheduledTime);
			resetForm();
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to schedule');
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setMode('specific');
		setDate(undefined);
		setHour('12');
		setMinute('00');
		setQueueInterval('4');
		setError(null);
	};

	const handleCancel = () => {
		resetForm();
		onOpenChange(false);
	};

	const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
	const minutes = ['00', '15', '30', '45'];
	const queueIntervals = [
		{ value: '1', label: '1 hour' },
		{ value: '2', label: '2 hours' },
		{ value: '4', label: '4 hours' },
		{ value: '6', label: '6 hours' },
		{ value: '8', label: '8 hours' },
		{ value: '12', label: '12 hours' },
		{ value: '24', label: '24 hours' },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{needsApproval ? 'Approve & Schedule' : 'Schedule Post'}
					</DialogTitle>
					<DialogDescription>
						{itemTitle
							? `Schedule "${itemTitle}" for publishing.`
							: 'Choose when to publish this content.'}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<RadioGroup
						value={mode}
						onValueChange={(v: string) => setMode(v as ScheduleMode)}
						className="grid grid-cols-2 gap-4"
					>
						<div>
							<RadioGroupItem
								value="specific"
								id="specific"
								className="peer sr-only"
							/>
							<Label
								htmlFor="specific"
								className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
							>
								<CalendarIcon className="mb-3 h-6 w-6" />
								<span className="text-sm font-medium">Specific Time</span>
							</Label>
						</div>
						<div>
							<RadioGroupItem
								value="queue"
								id="queue"
								className="peer sr-only"
							/>
							<Label
								htmlFor="queue"
								className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
							>
								<Clock className="mb-3 h-6 w-6" />
								<span className="text-sm font-medium">Add to Queue</span>
							</Label>
						</div>
					</RadioGroup>

					{mode === 'specific' ? (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Date</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												'w-full justify-start text-left font-normal',
												!date && 'text-muted-foreground'
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{date ? format(date, 'PPP') : 'Pick a date'}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={date}
											onSelect={setDate}
											disabled={(date) => date < startOfDay(new Date())}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Hour</Label>
									<Select value={hour} onValueChange={setHour}>
										<SelectTrigger>
											<SelectValue placeholder="Hour" />
										</SelectTrigger>
										<SelectContent>
											{hours.map((h) => (
												<SelectItem key={h} value={h}>
													{h}:00
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Minute</Label>
									<Select value={minute} onValueChange={setMinute}>
										<SelectTrigger>
											<SelectValue placeholder="Minute" />
										</SelectTrigger>
										<SelectContent>
											{minutes.map((m) => (
												<SelectItem key={m} value={m}>
													:{m}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{date && (
								<p className="text-sm text-muted-foreground">
									Scheduled for:{' '}
									<span className="font-medium text-foreground">
										{format(
											setMinutes(
												setHours(startOfDay(date), parseInt(hour)),
												parseInt(minute)
											),
											'PPP p'
										)}
									</span>
								</p>
							)}
						</div>
					) : (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Publish in</Label>
								<Select value={queueInterval} onValueChange={setQueueInterval}>
									<SelectTrigger>
										<SelectValue placeholder="Select interval" />
									</SelectTrigger>
									<SelectContent>
										{queueIntervals.map((interval) => (
											<SelectItem key={interval.value} value={interval.value}>
												{interval.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<p className="text-sm text-muted-foreground">
								Will be published at:{' '}
								<span className="font-medium text-foreground">
									{format(
										addHours(new Date(), parseInt(queueInterval)),
										'PPP p'
									)}
								</span>
							</p>
						</div>
					)}

					{error && <p className="text-sm text-red-600">{error}</p>}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isSubmitting || (mode === 'specific' && !date)}
					>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{needsApproval ? 'Approve & Schedule' : 'Schedule'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
