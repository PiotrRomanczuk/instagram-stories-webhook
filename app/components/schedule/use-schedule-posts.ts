import { useState, useEffect, useCallback } from 'react';
import { ScheduledPost } from '@/lib/types';

export function useSchedulePosts() {
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        try {
            const res = await fetch('/api/schedule');
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
        const interval = setInterval(fetchPosts, 30000);
        return () => clearInterval(interval);
    }, [fetchPosts]);

    return { posts, loading, fetchPosts };
}
