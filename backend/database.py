"""
Database configuration and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import time
import logging

logger = logging.getLogger(__name__)

# Database URL from environment or default
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://astraeus:astraeus123@localhost:55432/astraeus"
)

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def init_db():
    """Initialize database tables with retries"""
    retries = 5
    while retries > 0:
        try:
            with engine.begin() as conn:
                Base.metadata.create_all(bind=conn)
            logger.info("Database connected and initialized.")
            break
        except Exception as e:
            retries -= 1
            logger.warning(f"Database connection failed. Retrying... ({retries} left). Error: {e}")
            time.sleep(3)
            if retries == 0:
                logger.error("Failed to connect to the database after multiple retries.")
                raise

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
