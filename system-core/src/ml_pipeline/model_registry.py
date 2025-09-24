from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import json
import hashlib

class ModelStatus(Enum):
    TRAINING = "training"
    READY = "ready"
    DEPLOYED = "deployed"
    DEPRECATED = "deprecated"
    FAILED = "failed"

@dataclass
class ModelMetadata:
    name: str
    version: str
    description: str
    model_type: str
    framework: str
    created_at: datetime
    updated_at: datetime
    status: ModelStatus
    metrics: Dict[str, float]
    tags: List[str]
    artifacts: Dict[str, str]  # artifact_name -> storage_path
    dependencies: List[str]
    author: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "model_type": self.model_type,
            "framework": self.framework,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "status": self.status.value,
            "metrics": self.metrics,
            "tags": self.tags,
            "artifacts": self.artifacts,
            "dependencies": self.dependencies,
            "author": self.author
        }

class ModelRegistry:
    """Registry for managing ML models"""
    
    def __init__(self, storage_backend=None):
        self.models: Dict[str, ModelMetadata] = {}
        self.storage_backend = storage_backend
    
    def register_model(self, metadata: ModelMetadata) -> str:
        """Register a new model"""
        model_id = self._generate_model_id(metadata.name, metadata.version)
        
        if model_id in self.models:
            raise ValueError(f"Model already exists: {model_id}")
        
        self.models[model_id] = metadata
        
        # Persist to storage if backend is available
        if self.storage_backend:
            self.storage_backend.save_metadata(model_id, metadata)
        
        return model_id
    
    def update_model(self, model_id: str, **kwargs) -> None:
        """Update model metadata"""
        if model_id not in self.models:
            raise ValueError(f"Model not found: {model_id}")
        
        metadata = self.models[model_id]
        
        for key, value in kwargs.items():
            if hasattr(metadata, key):
                setattr(metadata, key, value)
        
        metadata.updated_at = datetime.now()
        
        # Persist changes
        if self.storage_backend:
            self.storage_backend.save_metadata(model_id, metadata)
    
    def get_model(self, model_id: str) -> Optional[ModelMetadata]:
        """Get model metadata"""
        return self.models.get(model_id)
    
    def list_models(self, 
                   status: Optional[ModelStatus] = None,
                   model_type: Optional[str] = None,
                   tags: Optional[List[str]] = None) -> List[ModelMetadata]:
        """List models with optional filtering"""
        models = list(self.models.values())
        
        if status:
            models = [m for m in models if m.status == status]
        
        if model_type:
            models = [m for m in models if m.model_type == model_type]
        
        if tags:
            models = [m for m in models if any(tag in m.tags for tag in tags)]
        
        return models
    
    def delete_model(self, model_id: str) -> None:
        """Delete a model"""
        if model_id not in self.models:
            raise ValueError(f"Model not found: {model_id}")
        
        # Remove from storage
        if self.storage_backend:
            self.storage_backend.delete_model(model_id)
        
        del self.models[model_id]
    
    def promote_model(self, model_id: str, target_status: ModelStatus) -> None:
        """Promote model to a new status"""
        if model_id not in self.models:
            raise ValueError(f"Model not found: {model_id}")
        
        self.update_model(model_id, status=target_status)
    
    def get_latest_version(self, model_name: str) -> Optional[ModelMetadata]:
        """Get the latest version of a model"""
        matching_models = [m for m in self.models.values() if m.name == model_name]
        
        if not matching_models:
            return None
        
        # Sort by version (assuming semantic versioning)
        return max(matching_models, key=lambda m: m.version)
    
    def _generate_model_id(self, name: str, version: str) -> str:
        """Generate unique model ID"""
        return f"{name}:{version}"

class ModelArtifactManager:
    """Manages model artifacts and files"""
    
    def __init__(self, storage_path: str = "./models"):
        self.storage_path = storage_path
    
    def save_artifact(self, model_id: str, artifact_name: str, data: bytes) -> str:
        """Save model artifact"""
        import os
        
        model_dir = os.path.join(self.storage_path, model_id)
        os.makedirs(model_dir, exist_ok=True)
        
        artifact_path = os.path.join(model_dir, artifact_name)
        
        with open(artifact_path, 'wb') as f:
            f.write(data)
        
        return artifact_path
    
    def load_artifact(self, model_id: str, artifact_name: str) -> bytes:
        """Load model artifact"""
        import os
        
        artifact_path = os.path.join(self.storage_path, model_id, artifact_name)
        
        if not os.path.exists(artifact_path):
            raise FileNotFoundError(f"Artifact not found: {artifact_path}")
        
        with open(artifact_path, 'rb') as f:
            return f.read()
    
    def delete_artifacts(self, model_id: str) -> None:
        """Delete all artifacts for a model"""
        import os
        import shutil
        
        model_dir = os.path.join(self.storage_path, model_id)
        
        if os.path.exists(model_dir):
            shutil.rmtree(model_dir)
