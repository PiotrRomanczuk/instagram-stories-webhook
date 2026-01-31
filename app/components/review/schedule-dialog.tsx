'use client';

import { useState } from 'react';
import { format, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
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

type ScheduleMode = 'specific' | 'soon';

export function ScheduleDialog({
	open,
	onOpenChange,
	onConfirm,
	needsApproval = false,
	itemTitle,
}: ScheduleDialogProps) {
	const [mode, setMode] = useState<ScheduleMode>('specific');
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [time, setTime] = useState('12:00');
	const [soonMinutes, setSoonMinutes] = useState('0');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const getScheduledTime = (): number => {
		if (mode === 'soon') {
			// Soon mode: schedule X minutes from now (or now + 1 min for "now")
			const mins = parseInt(soonMinutes);
			// Add at least 1 minute to ensure it's in the future
			return addMinutes(new Date(), mins === 0 ? 1 : mins).getTime();
		}

		if (!date) {
			throw new Error('Please select a date');
		}

		// Specific mode: parse time string "HH:MM"
		const [hours, mins] = time.split(':').map(Number);
		const scheduledDate = setMinutes(setHours(startOfDay(date), hours), mins);
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
		setTime('12:00');
		setSoonMinutes('0');
		setError(null);
	};

	const handleCancel = () => {
		resetForm();
		onOpenChange(false);
	};

	const soonIntervals = [
		{ value: '0', label: 'Now' },
		{ value: '3', label: 'In 3 minutes' },
		{ value: '5', label: 'In 5 minutes' },
		{ value: '10', label: 'In 10 minutes' },
		{ value: '15', label: 'In 15 minutes' },
		{ value: '20', label: 'In 20 minutes' },
		{ value: '30', label: 'In 30 minutes' },
		{ value: '60', label: 'In 1 hour' },
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
								value="soon"
								id="soon"
								className="peer sr-only"
							/>
							<Label
								htmlFor="soon"
								className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
							>
								<Clock className="mb-3 h-6 w-6" />
								<span className="text-sm font-medium text-center">Post Now or Soon</span>
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

							<div className="space-y-2">
								<Label>Time</Label>
								<input
									type="time"
									value={time}
									onChange={(e) => setTime(e.target.value)}
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								/>
							</div>

							{date && (
								<p className="text-sm text-muted-foreground">
									Scheduled for:{' '}
									<span className="font-medium text-foreground">
										{format(
											setMinutes(
												setHours(startOfDay(date), parseInt(time.split(':')[0])),
												parseInt(time.split(':')[1])
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
								<Label>When to publish</Label>
								<Select value={soonMinutes} onValueChange={setSoonMinutes}>
									<SelectTrigger>
										<SelectValue placeholder="Select when" />
									</SelectTrigger>
									<SelectContent>
										{soonIntervals.map((interval) => (
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
										addMinutes(new Date(), parseInt(soonMinutes) === 0 ? 1 : parseInt(soonMinutes)),
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
