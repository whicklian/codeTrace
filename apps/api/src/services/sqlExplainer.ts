import pg from 'pg';

export interface SqlPlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Alias"?: string;
  "Startup Cost": number;
  "Total Cost": number;
  "Plan Rows": number;
  "Plan Width": number;
  "Actual Startup Time"?: number;
  "Actual Total Time"?: number;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Filter"?: string;
  "Rows Removed by Filter"?: number;
  "Index Name"?: string;
  "Index Cond"?: string;
  "Hash Cond"?: string;
  "Join Type"?: string;
  "Plans"?: SqlPlanNode[];
}

export interface SqlExplainResult {
  success: boolean;
  query: string;
  plan?: {
    Plan: SqlPlanNode;
    "Planning Time": number;
    "Execution Time": number;
  };
  metrics?: {
    isFullTableScan: boolean;
    bottleneckNode: string;
    totalCost: number;
    executionTimeMs: number;
    recommendation?: string;
  };
  error?: string;
}

export async function explainQuery(query: string): Promise<SqlExplainResult> {
  const dbUrl = process.env.DATABASE_URL;

  // If a live PostgreSQL connection is available, execute in a safe read-only transaction
  if (dbUrl) {
    const client = new pg.Client({ connectionString: dbUrl });
    try {
      await client.connect();
      await client.query('BEGIN READ ONLY;');
      const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query};`;
      const res = await client.query(explainSql);
      await client.query('ROLLBACK;');

      const planData = res.rows[0]['QUERY PLAN'][0];
      const metrics = analyzePlanMetrics(planData.Plan, planData['Execution Time']);

      return {
        success: true,
        query,
        plan: planData,
        metrics
      };
    } catch (err: any) {
      try {
        await client.query('ROLLBACK;');
      } catch {}
      return {
        success: false,
        query,
        error: err.message
      };
    } finally {
      await client.end().catch(() => {});
    }
  }

  // Pre-seeded Sandbox Engine: Generates realistic execution plans for University DB scenarios
  return generateSandboxPlan(query);
}

function analyzePlanMetrics(rootNode: SqlPlanNode, executionTime: number) {
  let isFullTableScan = false;
  let highestCost = 0;
  let bottleneck = rootNode["Node Type"];

  function traverse(node: SqlPlanNode) {
    if (node["Node Type"] === "Seq Scan") {
      isFullTableScan = true;
    }
    if (node["Total Cost"] > highestCost) {
      highestCost = node["Total Cost"];
      bottleneck = `${node["Node Type"]} on ${node["Relation Name"] || 'subplan'}`;
    }
    if (node.Plans) {
      node.Plans.forEach(traverse);
    }
  }

  traverse(rootNode);

  return {
    isFullTableScan,
    bottleneckNode: bottleneck,
    totalCost: rootNode["Total Cost"],
    executionTimeMs: executionTime,
    recommendation: isFullTableScan
      ? "High-cost Sequential Scan detected. Consider adding a B-tree index on the filtered/joined column."
      : "Optimized scan using Index. Execution time within optimal threshold."
  };
}

function generateSandboxPlan(query: string): SqlExplainResult {
  const clean = query.trim().toLowerCase();

  // Scenario A: Unindexed JOIN on 50,000 rows (Bottleneck demo)
  const hasIndexHint = clean.includes('idx_') || clean.includes('create index') || clean.includes('use_index');

  if (!hasIndexHint) {
    const unindexedPlan: SqlPlanNode = {
      "Node Type": "Hash Join",
      "Join Type": "Inner",
      "Startup Cost": 1250.00,
      "Total Cost": 3840.50,
      "Plan Rows": 48200,
      "Plan Width": 64,
      "Actual Startup Time": 14.2,
      "Actual Total Time": 182.4,
      "Actual Rows": 48200,
      "Actual Loops": 1,
      "Hash Cond": "(enrollments.student_id = students.id)",
      "Plans": [
        {
          "Node Type": "Seq Scan",
          "Relation Name": "enrollments",
          "Alias": "e",
          "Startup Cost": 0.00,
          "Total Cost": 1820.00,
          "Plan Rows": 50000,
          "Plan Width": 32,
          "Actual Startup Time": 0.05,
          "Actual Total Time": 94.6,
          "Actual Rows": 50000,
          "Actual Loops": 1,
          "Filter": "(grade >= 'B'::text)",
          "Rows Removed by Filter": 12400
        },
        {
          "Node Type": "Hash",
          "Startup Cost": 950.00,
          "Total Cost": 950.00,
          "Plan Rows": 20000,
          "Plan Width": 32,
          "Actual Startup Time": 13.8,
          "Actual Total Time": 13.8,
          "Actual Rows": 20000,
          "Actual Loops": 1,
          "Plans": [
            {
              "Node Type": "Seq Scan",
              "Relation Name": "students",
              "Alias": "s",
              "Startup Cost": 0.00,
              "Total Cost": 950.00,
              "Plan Rows": 20000,
              "Plan Width": 32,
              "Actual Startup Time": 0.02,
              "Actual Total Time": 11.2,
              "Actual Rows": 20000,
              "Actual Loops": 1
            }
          ]
        }
      ]
    };

    return {
      success: true,
      query,
      plan: {
        Plan: unindexedPlan,
        "Planning Time": 0.45,
        "Execution Time": 182.4
      },
      metrics: {
        isFullTableScan: true,
        bottleneckNode: "Seq Scan on enrollments (50,000 rows)",
        totalCost: 3840.50,
        executionTimeMs: 182.4,
        recommendation: "CRITICAL: Sequential scan over 50,000 rows. Add an index on enrollments(student_id, grade) to reduce latency."
      }
    };
  }

  // Scenario B: Optimized Index Scan (After adding index)
  const indexedPlan: SqlPlanNode = {
    "Node Type": "Nested Loop",
    "Join Type": "Inner",
    "Startup Cost": 0.58,
    "Total Cost": 84.20,
    "Plan Rows": 120,
    "Plan Width": 64,
    "Actual Startup Time": 0.04,
    "Actual Total Time": 2.15,
    "Actual Rows": 120,
    "Actual Loops": 1,
    "Plans": [
      {
        "Node Type": "Index Scan",
        "Relation Name": "students",
        "Index Name": "idx_students_id",
        "Startup Cost": 0.28,
        "Total Cost": 8.30,
        "Plan Rows": 1,
        "Plan Width": 32,
        "Actual Startup Time": 0.02,
        "Actual Total Time": 0.03,
        "Actual Rows": 1,
        "Actual Loops": 1,
        "Index Cond": "(id = 1042)"
      },
      {
        "Node Type": "Index Only Scan",
        "Relation Name": "enrollments",
        "Index Name": "idx_enrollments_student_grade",
        "Startup Cost": 0.30,
        "Total Cost": 75.90,
        "Plan Rows": 120,
        "Plan Width": 32,
        "Actual Startup Time": 0.01,
        "Actual Total Time": 2.10,
        "Actual Rows": 120,
        "Actual Loops": 1,
        "Index Cond": "(student_id = students.id)"
      }
    ]
  };

  return {
    success: true,
    query,
    plan: {
      Plan: indexedPlan,
      "Planning Time": 0.32,
      "Execution Time": 2.15
    },
    metrics: {
      isFullTableScan: false,
      bottleneckNode: "Index Only Scan (Optimal)",
      totalCost: 84.20,
      executionTimeMs: 2.15,
      recommendation: "EXCELLENT: Index Only Scan active. Latency reduced from 182ms to 2.15ms (98.8% speedup)."
    }
  };
}
