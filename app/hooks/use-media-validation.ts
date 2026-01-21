'use client';

import { useState, useCallback } from 'react';
import {
    analyzeAspectRatio,
    validateForStories,
    getImageDimensionsFromFile,
    getImageDimensionsFromUrl
} from '@/lib/media/validator';
import { MediaDimensions, AspectRatioInfo } from '@/lib/types';

export interface MediaValidationState {
    isLoading: boolean;
    dimensions: MediaDimensions | null;
    aspectInfo: AspectRatioInfo | null;
    errors: string[];
    warnings: string[];
    isValid: boolean;
}

export function useMediaValidation() {
    const [state, setState] = useState<MediaValidationState>({
        isLoading: false,
        dimensions: null,
        aspectInfo: null,
        errors: [],
        warnings: [],
        isValid: false
    });

    const validateFile = useCallback(async (file: File) => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const dimensions = await getImageDimensionsFromFile(file);
            const validation = validateForStories(dimensions);

            setState({
                isLoading: false,
                dimensions,
                aspectInfo: validation.aspectInfo,
                errors: validation.errors,
                warnings: validation.warnings,
                isValid: validation.valid
            });

            return validation;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to validate image';
            setState({
                isLoading: false,
                dimensions: null,
                aspectInfo: null,
                errors: [message],
                warnings: [],
                isValid: false
            });
            return null;
        }
    }, []);

    const validateUrl = useCallback(async (url: string) => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const dimensions = await getImageDimensionsFromUrl(url);
            const validation = validateForStories(dimensions);

            setState({
                isLoading: false,
                dimensions,
                aspectInfo: validation.aspectInfo,
                errors: validation.errors,
                warnings: validation.warnings,
                isValid: validation.valid
            });

            return validation;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to validate image';
            setState({
                isLoading: false,
                dimensions: null,
                aspectInfo: null,
                errors: [message],
                warnings: [],
                isValid: false
            });
            return null;
        }
    }, []);

    const reset = useCallback(() => {
        setState({
            isLoading: false,
            dimensions: null,
            aspectInfo: null,
            errors: [],
            warnings: [],
            isValid: false
        });
    }, []);

    return {
        ...state,
        validateFile,
        validateUrl,
        reset
    };
}

/**
 * Quick helper to check aspect ratio without full validation
 */
export function useQuickAspectCheck() {
    const [aspectInfo, setAspectInfo] = useState<AspectRatioInfo | null>(null);
    // TODO: Add video metadata and validation state

    const checkDimensions = useCallback((width: number, height: number) => {
        const info = analyzeAspectRatio({ width, height });
        setAspectInfo(info);
        return info;
    }, []);

    return { aspectInfo, checkDimensions };
}
