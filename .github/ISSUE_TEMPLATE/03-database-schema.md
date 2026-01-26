---
name: Database Schema Change
about: Request a database schema modification
title: "[DB] "
labels: database
assignees: ''

---

## Change Description
<!-- Describe what needs to change in the database -->

## Affected Tables
<!-- List affected tables and columns -->
- `table_name` (columns: `col1`, `col2`)

## Change Type
- [ ] Add column(s)
- [ ] Remove column(s)
- [ ] Modify column constraints
- [ ] Create new table
- [ ] Update RLS policies
- [ ] Create/modify indexes

## Migration Details
<!-- Describe the migration specifics -->

### Current State
```sql
-- Show current table structure if relevant
```

### Desired State
```sql
-- Show desired table structure after migration
```

## Backward Compatibility
- [ ] Change is backward compatible (safe for rolling deployments)
- [ ] Change requires coordinated deployment
- [ ] Change requires data migration

## Data Migration (if applicable)
```sql
-- Include any backfill or data transformation SQL
```

## Testing Plan
- [ ] Tested locally with `supabase reset && supabase migration up`
- [ ] Verified with existing data
- [ ] Tested with production-like data volume
- [ ] RLS policies verified (if applicable)

## Related Documentation
- See [CLAUDE.md - Database Migrations](../CLAUDE.md#database-migrations)
- See [CLAUDE.md - Database Schema & Relationships](../CLAUDE.md#database-schema--relationships)
- See [WORKFLOWS.md - Create & Deploy Database Migration](../WORKFLOWS.md#workflow-create--deploy-database-migration)

## Rollback Plan
<!-- If migration fails, how will we recover? -->

## Performance Impact
- [ ] Expected performance impact: None / Minor / Significant
- Comment on index creation, table size considerations, etc.

## Related Issues
<!-- Link to related issues if any -->
