import { supabaseAdmin } from '../lib/config/supabase-admin';

async function checkLogs() {
    try {
        // Check total logs count
        const { count: totalLogs, error: countError } = await supabaseAdmin
            .from('system_logs')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error counting logs:', countError);
            return;
        }

        console.log(`Total logs in database: ${totalLogs || 0}`);

        // Get recent logs
        const { data: recentLogs, error: logsError } = await supabaseAdmin
            .from('system_logs')
            .select('id, level, module, message, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (logsError) {
            console.error('Error fetching logs:', logsError);
            return;
        }

        console.log('\nRecent logs:');
        recentLogs?.forEach((log) => {
            console.log(`[${log.created_at}] [${log.level.toUpperCase()}] [${log.module}] ${log.message}`);
        });

        // Check publishing logs
        const { count: publishingCount, error: pubCountError } = await supabaseAdmin
            .from('publishing_logs')
            .select('*', { count: 'exact', head: true });

        if (pubCountError) {
            console.error('Error counting publishing logs:', pubCountError);
            return;
        }

        console.log(`\nTotal publishing logs in database: ${publishingCount || 0}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkLogs();
