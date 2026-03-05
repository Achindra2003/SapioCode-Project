import os
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "sapiocode_dev")

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD)
)

# Persistent mock data storage
MOCK_DATA = {
    "mastery": {
        "S1:Algebra_Basics": 0.5,
        "S1:Geometry_Proofs": 0.3,
        "S2:Algebra_Basics": 0.7,
    }
}


class MockSession:
    """Mock Neo4j session for development without actual database."""
    
    def __init__(self):
        pass
    
    def run(self, query, **params):
        """Mock query execution with simple logic."""
        print(f"[MOCK_DB] Query: {query[:100]}...")
        print(f"[MOCK_DB] Params: {params}")
        
        # Handle MATCH queries (retrieval)
        if "MATCH" in query and "RETURN" in query:
            return MockResult(params)
        # Handle SET queries (updates)
        elif "SET" in query:
            key = f"{params['sid']}:{params['concept']}"
            if key not in MOCK_DATA["mastery"]:
                MOCK_DATA["mastery"][key] = 0.0
            MOCK_DATA["mastery"][key] = params['new_p']
            print(f"[MOCK_DB] Updated {key} to {params['new_p']}")
            return MockResult([])
        
        return MockResult([])
    
    def close(self):
        pass
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        self.close()


class MockResult:
    """Mock Neo4j result."""
    
    def __init__(self, params=None):
        self.params = params or {}
    
    def __iter__(self):
        # Return mock records for mastery update
        sid = self.params.get('sid', 'S1')
        
        # Return different data based on student ID
        return iter([
            MockRecord({
                "concept": "Algebra_Basics",
                "current_mastery": MOCK_DATA["mastery"].get(f"{sid}:Algebra_Basics", 0.5),
                "p_T": 0.1,
                "p_S": 0.1,
                "p_G": 0.2
            })
        ])


class MockRecord:
    """Mock Neo4j record."""
    
    def __init__(self, data):
        self.data = data
    
    def __getitem__(self, key):
        return self.data.get(key)


def get_session():
    """Get Neo4j session or mock session for development."""
    try:
        session = driver.session()
        # Test connection
        session.run("RETURN 1")
        print("[NEO4J] Using real database connection")
        return session
    except Exception as e:
        print(f"[NEO4J] Connection failed: {str(e)}")
        print("[NEO4J] Falling back to mock database for development")
        return MockSession()




