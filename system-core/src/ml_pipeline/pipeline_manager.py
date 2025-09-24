from typing import Dict, List, Any, Optional, Union
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging
from datetime import datetime

class PipelineStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class PipelineConfig:
    name: str
    version: str
    description: str
    stages: List[str]
    parameters: Dict[str, Any]
    resources: Dict[str, Any]
    timeout: int = 3600
    retry_count: int = 3

class MLPipeline(ABC):
    """Abstract base class for ML pipelines"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.status = PipelineStatus.PENDING
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.results: Dict[str, Any] = {}
        self.logger = logging.getLogger(f"pipeline.{config.name}")
    
    @abstractmethod
    async def execute_stage(self, stage: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific pipeline stage"""
        pass
    
    @abstractmethod
    async def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """Validate pipeline inputs"""
        pass
    
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the complete pipeline"""
        try:
            self.status = PipelineStatus.RUNNING
            self.start_time = datetime.now()
            
            # Validate inputs
            if not await self.validate_inputs(inputs):
                raise ValueError("Pipeline input validation failed")
            
            # Execute stages sequentially
            stage_outputs = inputs.copy()
            
            for stage in self.config.stages:
                self.logger.info(f"Executing stage: {stage}")
                stage_result = await self.execute_stage(stage, stage_outputs)
                stage_outputs.update(stage_result)
            
            self.results = stage_outputs
            self.status = PipelineStatus.COMPLETED
            self.end_time = datetime.now()
            
            return self.results
            
        except Exception as e:
            self.status = PipelineStatus.FAILED
            self.end_time = datetime.now()
            self.logger.error(f"Pipeline failed: {str(e)}")
            raise

class DataPipeline(MLPipeline):
    """Data processing pipeline"""
    
    async def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        required_keys = ['data_source', 'output_format']
        return all(key in inputs for key in required_keys)
    
    async def execute_stage(self, stage: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        if stage == "extract":
            return await self._extract_data(inputs)
        elif stage == "transform":
            return await self._transform_data(inputs)
        elif stage == "load":
            return await self._load_data(inputs)
        else:
            raise ValueError(f"Unknown stage: {stage}")
    
    async def _extract_data(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Extract data from source
        return {"extracted_data": f"data from {inputs['data_source']}"}
    
    async def _transform_data(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Transform extracted data
        return {"transformed_data": f"transformed {inputs.get('extracted_data', 'data')}"}
    
    async def _load_data(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Load data to destination
        return {"loaded_data": f"loaded to {inputs.get('output_format', 'default')}"}

class ModelPipeline(MLPipeline):
    """Model training and deployment pipeline"""
    
    async def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        required_keys = ['training_data', 'model_type']
        return all(key in inputs for key in required_keys)
    
    async def execute_stage(self, stage: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        if stage == "preprocess":
            return await self._preprocess_data(inputs)
        elif stage == "train":
            return await self._train_model(inputs)
        elif stage == "evaluate":
            return await self._evaluate_model(inputs)
        elif stage == "deploy":
            return await self._deploy_model(inputs)
        else:
            raise ValueError(f"Unknown stage: {stage}")
    
    async def _preprocess_data(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        return {"preprocessed_data": f"preprocessed {inputs['training_data']}"}
    
    async def _train_model(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        return {"trained_model": f"model trained on {inputs.get('preprocessed_data', 'data')}"}
    
    async def _evaluate_model(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        return {"evaluation_results": {"accuracy": 0.95, "f1_score": 0.93}}
    
    async def _deploy_model(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        return {"deployment_url": "https://api.model-endpoint.com/v1/predict"}

class PipelineManager:
    """Manages multiple ML pipelines"""
    
    def __init__(self):
        self.pipelines: Dict[str, MLPipeline] = {}
        self.logger = logging.getLogger("pipeline_manager")
    
    def register_pipeline(self, pipeline_id: str, pipeline: MLPipeline):
        """Register a new pipeline"""
        self.pipelines[pipeline_id] = pipeline
        self.logger.info(f"Registered pipeline: {pipeline_id}")
    
    async def execute_pipeline(self, pipeline_id: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a registered pipeline"""
        if pipeline_id not in self.pipelines:
            raise ValueError(f"Pipeline not found: {pipeline_id}")
        
        pipeline = self.pipelines[pipeline_id]
        return await pipeline.run(inputs)
    
    def get_pipeline_status(self, pipeline_id: str) -> PipelineStatus:
        """Get the status of a pipeline"""
        if pipeline_id not in self.pipelines:
            raise ValueError(f"Pipeline not found: {pipeline_id}")
        
        return self.pipelines[pipeline_id].status
    
    def list_pipelines(self) -> List[str]:
        """List all registered pipelines"""
        return list(self.pipelines.keys())
