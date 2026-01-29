'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, User } from 'lucide-react';

interface InstagramPreviewProps {
	mediaUrl: string;
	type?: 'IMAGE' | 'VIDEO';
	caption?: string;
	userTags?: string[];
	hashtagTags?: string[];
	className?: string;
}

export function InstagramPreview({
	mediaUrl,
	type = 'IMAGE',
	caption,
	userTags = [],
	hashtagTags = [],
	className = '',
}: InstagramPreviewProps) {
	const [isPreviewMode, setIsPreviewMode] = useState(false);

	if (!mediaUrl) {
		return null;
	}

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Toggle Button */}
			<button
				onClick={() => setIsPreviewMode(!isPreviewMode)}
				className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition'
			>
				{isPreviewMode ? (
					<>
						<EyeOff className='w-4 h-4' />
						Hide Instagram Preview
					</>
				) : (
					<>
						<Eye className='w-4 h-4' />
						Show Instagram Preview
					</>
				)}
			</button>

			{/* Preview Container */}
			{isPreviewMode && (
				<div className='bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl p-8 flex flex-col lg:flex-row items-center justify-center gap-8'>
					{/* Side-by-side comparison */}
					<div className='flex flex-col items-center gap-3'>
						<h3 className='text-sm font-bold text-slate-600 uppercase tracking-wider'>
							What you upload
						</h3>
						<div className='bg-white rounded-2xl p-4 shadow-lg'>
							<div className='relative w-64 aspect-square bg-slate-100 rounded-xl overflow-hidden'>
								{type === 'VIDEO' ? (
									<video
										src={mediaUrl}
										className='w-full h-full object-cover'
										controls={false}
									/>
								) : (
									<Image
										src={mediaUrl}
										alt='Original upload'
										fill
										className='object-cover'
										unoptimized
									/>
								)}
							</div>
						</div>
					</div>

					{/* Arrow */}
					<div className='text-4xl text-slate-400 hidden lg:block'>→</div>

					{/* Phone Mockup */}
					<div className='flex flex-col items-center gap-3'>
						<h3 className='text-sm font-bold text-slate-600 uppercase tracking-wider'>
							What followers see
						</h3>
						<div className='relative'>
							{/* iPhone Bezel */}
							<div
								className='relative bg-slate-900 rounded-[3rem] p-3 shadow-2xl'
								style={{ width: '280px', height: '560px' }}
							>
								{/* Dynamic Island */}
								<div className='absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-20'></div>

								{/* Screen Content */}
								<div className='relative w-full h-full bg-black rounded-[2.5rem] overflow-hidden'>
									{/* Instagram Story Content (9:16 aspect ratio) */}
									<div className='relative w-full h-full'>
										<div className='relative w-full h-full bg-zinc-900 overflow-hidden'>
											{/* Media Background */}
											{type === 'VIDEO' ? (
												<video
													src={mediaUrl}
													className='w-full h-full object-contain z-10 relative'
													controls={false}
												/>
											) : (
												<Image
													src={mediaUrl}
													alt='Instagram Story Preview'
													fill
													className='object-contain z-10 relative'
													unoptimized
												/>
											)}

											{/* Blurred Background for non-9:16 media */}
											<div
												className='absolute inset-0 opacity-40 blur-xl scale-110'
												style={{
													backgroundImage: `url(${mediaUrl})`,
													backgroundSize: 'cover',
													backgroundPosition: 'center',
												}}
											/>
										</div>

										{/* Gradient Overlays */}
										<div className='absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10'></div>
										<div className='absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-10'></div>

										{/* Top Bar - Profile Info */}
										<div className='absolute top-4 left-4 right-4 flex items-center gap-2 z-20'>
											<div className='w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center'>
												<User className='w-4 h-4 text-white' />
											</div>
											<span className='text-white font-bold text-sm drop-shadow-lg'>
												your_account
											</span>
											<span className='text-white/70 text-xs'>2h</span>
										</div>

										{/* User Tags (if any) */}
										{userTags.length > 0 && (
											<div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20'>
												<div className='bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5'>
													<User className='w-3 h-3 text-white' />
													<span className='text-white text-xs font-bold'>
														@{userTags[0]}
														{userTags.length > 1 && ` +${userTags.length - 1}`}
													</span>
												</div>
											</div>
										)}

										{/* Bottom - Caption & Hashtags */}
										{(caption || hashtagTags.length > 0) && (
											<div className='absolute bottom-4 left-4 right-4 z-20'>
												{caption && (
													<p className='text-white text-sm font-medium drop-shadow-lg mb-2 line-clamp-3'>
														{caption}
													</p>
												)}
												{hashtagTags.length > 0 && (
													<div className='flex flex-wrap gap-1.5'>
														{hashtagTags.slice(0, 5).map((tag, i) => (
															<span
																key={i}
																className='text-blue-300 text-xs font-medium drop-shadow'
															>
																#{tag}
															</span>
														))}
														{hashtagTags.length > 5 && (
															<span className='text-white/70 text-xs'>
																+{hashtagTags.length - 5} more
															</span>
														)}
													</div>
												)}
											</div>
										)}

										{/* Progress Bar (Top) */}
										<div className='absolute top-2 left-2 right-2 h-0.5 bg-white/30 rounded-full overflow-hidden z-20'>
											<div className='h-full w-1/3 bg-white rounded-full'></div>
										</div>
									</div>
								</div>
							</div>

							{/* Device Label */}
							<div className='absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-slate-400 font-medium whitespace-nowrap'>
								iPhone 15 Pro
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Helper Text */}
			{isPreviewMode && (
				<div className='bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3'>
					<div className='w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0'>
						💡
					</div>
					<div className='text-sm text-indigo-900'>
						<p className='font-bold mb-1'>Preview Tips:</p>
						<ul className='text-xs text-indigo-700 space-y-1'>
							<li>
								• Stories are displayed in 9:16 aspect ratio (full screen
								vertical)
							</li>
							<li>
								• Captions appear at the bottom with subtle shadow for
								readability
							</li>
							<li>• User tags show in the center when tapped</li>
							<li>
								• First 3 lines of caption are visible before "See more" link
							</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	);
}
