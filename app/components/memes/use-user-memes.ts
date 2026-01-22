import useSWR from 'swr';
import { MemeSubmission } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUserMemes() {
    const { data, error, isLoading, mutate } = useSWR<{ memes: MemeSubmission[] }>(
        '/api/memes',
        fetcher
    );

    return {
        memes: data?.memes || [],
        isLoading,
        isError: error,
        refresh: mutate
    };
}
