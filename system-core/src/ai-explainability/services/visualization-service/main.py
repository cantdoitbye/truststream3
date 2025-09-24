"""
Visualization Service for TrustStram v4.4

Creates stakeholder-specific visualizations for explanations with interactive dashboards.
"""

import asyncio
import base64
import io
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# Visualization libraries
try:
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
    import plotly.io as pio
except ImportError:
    logging.warning("Plotly not available. Install with: pip install plotly")
    plotly = None

try:
    import matplotlib.pyplot as plt
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import seaborn as sns
except ImportError:
    logging.warning("Matplotlib/Seaborn not available. Install with: pip install matplotlib seaborn")
    matplotlib = None

try:
    import bokeh
    from bokeh.plotting import figure, show
    from bokeh.models import ColumnDataSource, HoverTool
    from bokeh.layouts import column, row
    from bokeh.embed import components
except ImportError:
    logging.warning("Bokeh not available. Install with: pip install bokeh")
    bokeh = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TrustStram Visualization Service",
    description="Stakeholder-specific visualization generation for AI explanations",
    version="4.4.0"
)

# Request/Response Models
class VisualizationRequest(BaseModel):
    explanation_data: Dict[str, Any]
    stakeholder_type: str  # 'end_user', 'technical_user', 'business_user'
    visualization_type: str  # 'feature_importance', 'shap_waterfall', 'counterfactual', 'bias_report'
    style_preferences: Optional[Dict[str, Any]] = None
    interactive: bool = True
    export_format: str = 'html'  # 'html', 'png', 'svg', 'json'
    
class DashboardRequest(BaseModel):
    model_id: str
    stakeholder_type: str
    time_range: Optional[Dict[str, str]] = None
    dashboard_type: str = 'overview'  # 'overview', 'performance', 'fairness', 'explanations'
    
class VisualizationResponse(BaseModel):
    visualization_id: str
    stakeholder_type: str
    visualization_type: str
    content: str  # HTML, base64 encoded image, or JSON
    content_type: str
    interactive_elements: Optional[Dict[str, Any]] = None
    generation_time_ms: float
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    version: str
    visualizations_generated: int
    available_libraries: List[str]

# Global components
visualization_service = None
START_TIME = time.time()

@app.on_event("startup")
async def startup_event():
    """Initialize visualization service."""
    global visualization_service
    
    try:
        visualization_service = VisualizationService()
        logger.info("Visualization service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize visualization service: {str(e)}")
        raise

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    available_libs = []
    if plotly:
        available_libs.append("plotly")
    if matplotlib:
        available_libs.append("matplotlib")
    if bokeh:
        available_libs.append("bokeh")
    
    return HealthResponse(
        status="healthy",
        version="4.4.0",
        visualizations_generated=visualization_service.visualization_count if visualization_service else 0,
        available_libraries=available_libs
    )

@app.post("/visualize", response_model=VisualizationResponse)
async def create_visualization(
    request: VisualizationRequest
):
    """Create stakeholder-specific visualization."""
    start_time = time.time()
    
    try:
        visualization_result = await visualization_service.create_visualization(
            explanation_data=request.explanation_data,
            stakeholder_type=request.stakeholder_type,
            visualization_type=request.visualization_type,
            style_preferences=request.style_preferences,
            interactive=request.interactive,
            export_format=request.export_format
        )
        
        response = VisualizationResponse(
            visualization_id=visualization_result['id'],
            stakeholder_type=request.stakeholder_type,
            visualization_type=request.visualization_type,
            content=visualization_result['content'],
            content_type=visualization_result['content_type'],
            interactive_elements=visualization_result.get('interactive_elements'),
            generation_time_ms=(time.time() - start_time) * 1000,
            timestamp=datetime.now().isoformat()
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error creating visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/dashboard")
async def create_dashboard(
    request: DashboardRequest
):
    """Create stakeholder-specific dashboard."""
    try:
        dashboard_result = await visualization_service.create_dashboard(
            model_id=request.model_id,
            stakeholder_type=request.stakeholder_type,
            time_range=request.time_range,
            dashboard_type=request.dashboard_type
        )
        
        return dashboard_result
        
    except Exception as e:
        logger.error(f"Error creating dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/{dashboard_id}", response_class=HTMLResponse)
async def get_dashboard(dashboard_id: str):
    """Get dashboard HTML by ID."""
    try:
        dashboard_html = await visualization_service.get_dashboard_html(dashboard_id)
        
        if not dashboard_html:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        return HTMLResponse(content=dashboard_html)
        
    except Exception as e:
        logger.error(f"Error getting dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/visualization/{viz_id}")
async def get_visualization(viz_id: str, format: str = "html"):
    """Get visualization by ID in specified format."""
    try:
        visualization = await visualization_service.get_visualization(viz_id, format)
        
        if not visualization:
            raise HTTPException(status_code=404, detail="Visualization not found")
        
        # Return appropriate response based on format
        if format == "html":
            return HTMLResponse(content=visualization['content'])
        elif format in ["png", "svg"]:
            return Response(
                content=base64.b64decode(visualization['content']),
                media_type=f"image/{format}"
            )
        else:
            return visualization
        
    except Exception as e:
        logger.error(f"Error getting visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates/{stakeholder_type}")
async def get_visualization_templates(stakeholder_type: str):
    """Get available visualization templates for stakeholder type."""
    try:
        templates = await visualization_service.get_templates(stakeholder_type)
        return templates
        
    except Exception as e:
        logger.error(f"Error getting templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)


class VisualizationService:
    """
    Core visualization service for creating stakeholder-specific visualizations.
    """
    
    def __init__(self):
        """
        Initialize visualization service.
        """
        self.visualizations = {}  # Store generated visualizations
        self.dashboards = {}  # Store generated dashboards
        self.visualization_count = 0
        
        # Check library availability
        self.plotly_available = plotly is not None
        self.matplotlib_available = matplotlib is not None
        self.bokeh_available = bokeh is not None
        
        if not any([self.plotly_available, self.matplotlib_available, self.bokeh_available]):
            logger.warning("No visualization libraries available. Limited functionality.")
        
        # Style configurations for different stakeholders
        self.stakeholder_styles = {
            'end_user': {
                'color_scheme': 'friendly',
                'complexity': 'simple',
                'font_size': 14,
                'show_technical_details': False
            },
            'technical_user': {
                'color_scheme': 'professional',
                'complexity': 'detailed',
                'font_size': 12,
                'show_technical_details': True
            },
            'business_user': {
                'color_scheme': 'corporate',
                'complexity': 'moderate',
                'font_size': 13,
                'show_technical_details': False
            }
        }
        
        logger.info("Visualization service initialized")
    
    async def create_visualization(
        self,
        explanation_data: Dict[str, Any],
        stakeholder_type: str,
        visualization_type: str,
        style_preferences: Optional[Dict[str, Any]] = None,
        interactive: bool = True,
        export_format: str = 'html'
    ) -> Dict[str, Any]:
        """
        Create stakeholder-specific visualization.
        
        Args:
            explanation_data: Data to visualize
            stakeholder_type: Target stakeholder
            visualization_type: Type of visualization
            style_preferences: Custom style preferences
            interactive: Whether to create interactive visualization
            export_format: Output format
            
        Returns:
            Visualization result
        """
        try:
            # Generate visualization ID
            viz_id = f"viz_{int(time.time())}_{hash(str(explanation_data)) % 10000}"
            
            # Get style configuration
            style_config = self._get_style_config(stakeholder_type, style_preferences)
            
            # Create visualization based on type
            if visualization_type == 'feature_importance':
                viz_result = await self._create_feature_importance_viz(
                    explanation_data, stakeholder_type, style_config, interactive
                )
            elif visualization_type == 'shap_waterfall':
                viz_result = await self._create_shap_waterfall_viz(
                    explanation_data, stakeholder_type, style_config, interactive
                )
            elif visualization_type == 'counterfactual':
                viz_result = await self._create_counterfactual_viz(
                    explanation_data, stakeholder_type, style_config, interactive
                )
            elif visualization_type == 'bias_report':
                viz_result = await self._create_bias_report_viz(
                    explanation_data, stakeholder_type, style_config, interactive
                )
            elif visualization_type == 'decision_tree':
                viz_result = await self._create_decision_tree_viz(
                    explanation_data, stakeholder_type, style_config, interactive
                )
            else:
                raise ValueError(f"Unsupported visualization type: {visualization_type}")
            
            # Export to requested format
            content = await self._export_visualization(
                viz_result, export_format, style_config
            )
            
            # Store visualization
            result = {
                'id': viz_id,
                'content': content,
                'content_type': self._get_content_type(export_format),
                'interactive_elements': viz_result.get('interactive_elements'),
                'metadata': {
                    'stakeholder_type': stakeholder_type,
                    'visualization_type': visualization_type,
                    'created_at': datetime.now().isoformat()
                }
            }
            
            self.visualizations[viz_id] = result
            self.visualization_count += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating visualization: {str(e)}")
            raise
    
    async def _create_feature_importance_viz(
        self,
        explanation_data: Dict[str, Any],
        stakeholder_type: str,
        style_config: Dict[str, Any],
        interactive: bool
    ) -> Dict[str, Any]:
        """
        Create feature importance visualization.
        
        Args:
            explanation_data: Explanation data
            stakeholder_type: Target stakeholder
            style_config: Style configuration
            interactive: Whether to make interactive
            
        Returns:
            Visualization result
        """
        try:
            # Extract feature importance data
            feature_importance = explanation_data.get('feature_importance', {})
            
            if not feature_importance:
                raise ValueError("No feature importance data found")
            
            # Prepare data
            features = list(feature_importance.keys())
            importance_values = list(feature_importance.values())
            
            # Limit features based on stakeholder type
            max_features = self._get_max_features(stakeholder_type)
            if len(features) > max_features:
                # Sort by importance and take top features
                sorted_items = sorted(zip(features, importance_values), 
                                    key=lambda x: abs(x[1]), reverse=True)
                features = [item[0] for item in sorted_items[:max_features]]
                importance_values = [item[1] for item in sorted_items[:max_features]]
            
            if self.plotly_available and interactive:
                # Create Plotly visualization
                fig = go.Figure(data=[
                    go.Bar(
                        x=importance_values,
                        y=features,
                        orientation='h',
                        marker_color=self._get_colors(len(features), style_config),
                        hovertemplate='<b>%{y}</b><br>Importance: %{x:.3f}<extra></extra>'
                    )
                ])
                
                title = self._get_title('Feature Importance', stakeholder_type)
                fig.update_layout(
                    title=title,
                    xaxis_title='Importance Score',
                    yaxis_title='Features',
                    font=dict(size=style_config['font_size']),
                    template=self._get_plotly_template(style_config)
                )
                
                return {
                    'figure': fig,
                    'type': 'plotly',
                    'interactive_elements': {
                        'hover_info': True,
                        'zoom': True,
                        'pan': True
                    }
                }
            
            elif self.matplotlib_available:
                # Create Matplotlib visualization
                fig, ax = plt.subplots(figsize=(10, max(6, len(features) * 0.5)))
                
                bars = ax.barh(features, importance_values, 
                             color=self._get_colors(len(features), style_config))
                
                ax.set_xlabel('Importance Score', fontsize=style_config['font_size'])
                ax.set_title(self._get_title('Feature Importance', stakeholder_type), 
                           fontsize=style_config['font_size'] + 2)
                
                # Add value labels on bars if not too many features
                if len(features) <= 10:
                    for bar, value in zip(bars, importance_values):
                        ax.text(bar.get_width() + max(importance_values) * 0.01, 
                               bar.get_y() + bar.get_height()/2, 
                               f'{value:.3f}', 
                               va='center', fontsize=style_config['font_size'] - 2)
                
                plt.tight_layout()
                
                return {
                    'figure': fig,
                    'type': 'matplotlib',
                    'interactive_elements': {}
                }
            
            else:
                # Fallback to simple text representation
                return {
                    'data': {
                        'features': features,
                        'importance': importance_values,
                        'title': self._get_title('Feature Importance', stakeholder_type)
                    },
                    'type': 'data',
                    'interactive_elements': {}
                }
                
        except Exception as e:
            logger.error(f"Error creating feature importance visualization: {str(e)}")
            raise
    
    async def _create_shap_waterfall_viz(
        self,
        explanation_data: Dict[str, Any],
        stakeholder_type: str,
        style_config: Dict[str, Any],
        interactive: bool
    ) -> Dict[str, Any]:
        """
        Create SHAP waterfall visualization.
        
        Args:
            explanation_data: Explanation data with SHAP values
            stakeholder_type: Target stakeholder
            style_config: Style configuration
            interactive: Whether to make interactive
            
        Returns:
            Visualization result
        """
        try:
            # Extract SHAP data
            shap_values = explanation_data.get('shap_values', [])
            feature_names = explanation_data.get('feature_names', [])
            expected_value = explanation_data.get('expected_value', 0)
            
            if not shap_values or not feature_names:
                raise ValueError("No SHAP values or feature names found")
            
            # Limit features for end users
            max_features = self._get_max_features(stakeholder_type)
            if len(shap_values) > max_features:
                # Sort by absolute SHAP value and take top features
                sorted_indices = sorted(range(len(shap_values)), 
                                      key=lambda i: abs(shap_values[i]), reverse=True)
                top_indices = sorted_indices[:max_features]
                shap_values = [shap_values[i] for i in top_indices]
                feature_names = [feature_names[i] for i in top_indices]
            
            if self.plotly_available and interactive:
                # Create waterfall chart
                fig = self._create_plotly_waterfall(
                    shap_values, feature_names, expected_value, style_config, stakeholder_type
                )
                
                return {
                    'figure': fig,
                    'type': 'plotly',
                    'interactive_elements': {
                        'hover_info': True,
                        'zoom': True
                    }
                }
            
            elif self.matplotlib_available:
                # Create simple bar chart showing SHAP values
                fig, ax = plt.subplots(figsize=(12, max(6, len(feature_names) * 0.5)))
                
                # Color bars based on positive/negative values
                colors = ['green' if val > 0 else 'red' for val in shap_values]
                
                bars = ax.barh(feature_names, shap_values, color=colors, alpha=0.7)
                
                ax.axvline(x=0, color='black', linestyle='-', linewidth=1)
                ax.set_xlabel('SHAP Value (Impact on Prediction)', fontsize=style_config['font_size'])
                ax.set_title(self._get_title('Feature Impact Analysis', stakeholder_type), 
                           fontsize=style_config['font_size'] + 2)
                
                # Add expected value line
                ax.axvline(x=expected_value, color='blue', linestyle='--', alpha=0.7, 
                          label=f'Expected Value: {expected_value:.3f}')
                ax.legend()
                
                plt.tight_layout()
                
                return {
                    'figure': fig,
                    'type': 'matplotlib',
                    'interactive_elements': {}
                }
            
            else:
                # Fallback to data representation
                return {
                    'data': {
                        'shap_values': shap_values,
                        'feature_names': feature_names,
                        'expected_value': expected_value,
                        'title': self._get_title('Feature Impact Analysis', stakeholder_type)
                    },
                    'type': 'data',
                    'interactive_elements': {}
                }
                
        except Exception as e:
            logger.error(f"Error creating SHAP waterfall visualization: {str(e)}")
            raise
    
    def _create_plotly_waterfall(
        self,
        shap_values: List[float],
        feature_names: List[str],
        expected_value: float,
        style_config: Dict[str, Any],
        stakeholder_type: str
    ):
        """
        Create Plotly waterfall chart for SHAP values.
        
        Args:
            shap_values: SHAP values
            feature_names: Feature names
            expected_value: Expected/base value
            style_config: Style configuration
            stakeholder_type: Target stakeholder
            
        Returns:
            Plotly figure
        """
        # Calculate cumulative values for waterfall
        cumulative = [expected_value]
        for val in shap_values:
            cumulative.append(cumulative[-1] + val)
        
        # Prepare data for waterfall chart
        x_labels = ['Base Value'] + feature_names + ['Final Prediction']
        y_values = [expected_value] + shap_values + [0]
        
        # Create traces for positive and negative contributions
        fig = go.Figure()
        
        # Base value
        fig.add_trace(go.Bar(
            x=[x_labels[0]], 
            y=[expected_value],
            name='Base Value',
            marker_color='lightblue',
            hovertemplate='<b>%{x}</b><br>Value: %{y:.3f}<extra></extra>'
        ))
        
        # SHAP contributions
        for i, (feature, shap_val) in enumerate(zip(feature_names, shap_values)):
            color = 'green' if shap_val > 0 else 'red'
            opacity = 0.7
            
            fig.add_trace(go.Bar(
                x=[feature],
                y=[shap_val],
                name=f'{feature} ({shap_val:+.3f})',
                marker_color=color,
                opacity=opacity,
                hovertemplate=f'<b>{feature}</b><br>Impact: %{{y:+.3f}}<extra></extra>'
            ))
        
        # Final prediction
        fig.add_trace(go.Bar(
            x=[x_labels[-1]], 
            y=[cumulative[-1]],
            name='Final Prediction',
            marker_color='darkblue',
            hovertemplate='<b>%{x}</b><br>Value: %{y:.3f}<extra></extra>'
        ))
        
        # Update layout
        title = self._get_title('Prediction Explanation', stakeholder_type)
        fig.update_layout(
            title=title,
            xaxis_title='Components',
            yaxis_title='Prediction Value',
            font=dict(size=style_config['font_size']),
            template=self._get_plotly_template(style_config),
            showlegend=False,
            hovermode='x unified'
        )
        
        return fig
    
    async def _create_counterfactual_viz(
        self,
        explanation_data: Dict[str, Any],
        stakeholder_type: str,
        style_config: Dict[str, Any],
        interactive: bool
    ) -> Dict[str, Any]:
        """
        Create counterfactual explanation visualization.
        
        Args:
            explanation_data: Counterfactual explanation data
            stakeholder_type: Target stakeholder
            style_config: Style configuration
            interactive: Whether to make interactive
            
        Returns:
            Visualization result
        """
        try:
            counterfactuals = explanation_data.get('counterfactuals', [])
            
            if not counterfactuals:
                raise ValueError("No counterfactual data found")
            
            # Take the best counterfactual (first one, assumed to be sorted by quality)
            best_cf = counterfactuals[0] if counterfactuals else {}
            changes = best_cf.get('changes', [])
            
            if not changes:
                return {
                    'data': {'message': 'No actionable changes found'},
                    'type': 'data',
                    'interactive_elements': {}
                }
            
            # Limit changes for end users
            max_changes = 5 if stakeholder_type == 'end_user' else len(changes)
            changes = changes[:max_changes]
            
            if self.plotly_available and interactive:
                # Create comparison chart
                fig = self._create_counterfactual_comparison(
                    changes, style_config, stakeholder_type
                )
                
                return {
                    'figure': fig,
                    'type': 'plotly',
                    'interactive_elements': {
                        'hover_info': True,
                        'comparison_mode': True
                    }
                }
            
            elif self.matplotlib_available:
                # Create simple before/after comparison
                fig, ax = plt.subplots(figsize=(12, max(6, len(changes) * 0.8)))
                
                features = [change['feature'] for change in changes]
                original_values = [change['original_value'] for change in changes]
                new_values = [change['counterfactual_value'] for change in changes]
                
                x = np.arange(len(features))
                width = 0.35
                
                bars1 = ax.bar(x - width/2, original_values, width, 
                             label='Current Value', alpha=0.7)
                bars2 = ax.bar(x + width/2, new_values, width, 
                             label='Recommended Value', alpha=0.7)
                
                ax.set_xlabel('Features', fontsize=style_config['font_size'])
                ax.set_ylabel('Values', fontsize=style_config['font_size'])
                ax.set_title(self._get_title('Recommended Changes', stakeholder_type), 
                           fontsize=style_config['font_size'] + 2)
                ax.set_xticks(x)
                ax.set_xticklabels(features, rotation=45, ha='right')
                ax.legend()
                
                plt.tight_layout()
                
                return {
                    'figure': fig,
                    'type': 'matplotlib',
                    'interactive_elements': {}
                }
            
            else:
                # Fallback to data representation
                return {
                    'data': {
                        'changes': changes,
                        'title': self._get_title('Recommended Changes', stakeholder_type)
                    },
                    'type': 'data',
                    'interactive_elements': {}
                }
                
        except Exception as e:
            logger.error(f"Error creating counterfactual visualization: {str(e)}")
            raise
    
    def _create_counterfactual_comparison(
        self,
        changes: List[Dict[str, Any]],
        style_config: Dict[str, Any],
        stakeholder_type: str
    ):
        """
        Create Plotly comparison chart for counterfactual changes.
        
        Args:
            changes: List of feature changes
            style_config: Style configuration
            stakeholder_type: Target stakeholder
            
        Returns:
            Plotly figure
        """
        fig = go.Figure()
        
        features = [change['feature'] for change in changes]
        original_values = [change['original_value'] for change in changes]
        new_values = [change['counterfactual_value'] for change in changes]
        directions = [change['change_direction'] for change in changes]
        
        # Current values
        fig.add_trace(go.Bar(
            name='Current Value',
            x=features,
            y=original_values,
            marker_color='lightblue',
            opacity=0.7,
            hovertemplate='<b>%{x}</b><br>Current: %{y}<extra></extra>'
        ))
        
        # Recommended values
        colors = ['green' if direction == 'increase' else 'orange' 
                 for direction in directions]
        
        fig.add_trace(go.Bar(
            name='Recommended Value',
            x=features,
            y=new_values,
            marker_color=colors,
            opacity=0.7,
            hovertemplate='<b>%{x}</b><br>Recommended: %{y}<br>Action: %{text}<extra></extra>',
            text=[f"{direction.title()} by {abs(new - orig):.2f}" 
                  for new, orig, direction in zip(new_values, original_values, directions)]
        ))
        
        title = self._get_title('What-If Scenario: Path to Better Outcome', stakeholder_type)
        fig.update_layout(
            title=title,
            xaxis_title='Features to Change',
            yaxis_title='Feature Values',
            barmode='group',
            font=dict(size=style_config['font_size']),
            template=self._get_plotly_template(style_config)
        )
        
        return fig
    
    async def _create_bias_report_viz(
        self,
        explanation_data: Dict[str, Any],
        stakeholder_type: str,
        style_config: Dict[str, Any],
        interactive: bool
    ) -> Dict[str, Any]:
        """
        Create bias report visualization.
        
        Args:
            explanation_data: Bias audit data
            stakeholder_type: Target stakeholder
            style_config: Style configuration
            interactive: Whether to make interactive
            
        Returns:
            Visualization result
        """
        try:
            fairness_metrics = explanation_data.get('fairlearn_metrics', {})
            protected_groups = explanation_data.get('protected_groups_analysis', {})
            
            if not fairness_metrics and not protected_groups:
                raise ValueError("No bias/fairness data found")
            
            if self.plotly_available and interactive:
                # Create multi-panel bias dashboard
                fig = self._create_bias_dashboard(
                    fairness_metrics, protected_groups, style_config, stakeholder_type
                )
                
                return {
                    'figure': fig,
                    'type': 'plotly',
                    'interactive_elements': {
                        'multi_panel': True,
                        'dropdown_filters': True
                    }
                }
            
            else:
                # Simple summary for non-interactive
                return {
                    'data': {
                        'fairness_summary': self._summarize_fairness_metrics(fairness_metrics),
                        'group_analysis': protected_groups,
                        'title': self._get_title('Fairness Analysis', stakeholder_type)
                    },
                    'type': 'data',
                    'interactive_elements': {}
                }
                
        except Exception as e:
            logger.error(f"Error creating bias report visualization: {str(e)}")
            raise
    
    def _create_bias_dashboard(
        self,
        fairness_metrics: Dict[str, Any],
        protected_groups: Dict[str, Any],
        style_config: Dict[str, Any],
        stakeholder_type: str
    ):
        """
        Create comprehensive bias analysis dashboard.
        
        Args:
            fairness_metrics: Fairness metrics data
            protected_groups: Protected groups analysis
            style_config: Style configuration
            stakeholder_type: Target stakeholder
            
        Returns:
            Plotly figure with subplots
        """
        # Create subplots
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=(
                'Demographic Parity by Group',
                'Group Representation',
                'Prediction Rates by Group', 
                'Fairness Score Summary'
            ),
            specs=[[{"type": "bar"}, {"type": "pie"}],
                   [{"type": "bar"}, {"type": "indicator"}]]
        )
        
        # Process data for visualization
        for attr, metrics in fairness_metrics.items():
            if 'group_statistics' in metrics:
                group_stats = metrics['group_statistics']
                groups = list(group_stats.keys())
                rates = [stats['positive_prediction_rate'] for stats in group_stats.values()]
                
                # Demographic parity chart
                fig.add_trace(
                    go.Bar(x=groups, y=rates, name=f'{attr} Prediction Rates'),
                    row=1, col=1
                )
                
                # Prediction rates by group
                fig.add_trace(
                    go.Bar(x=groups, y=rates, name=f'{attr} Rates', showlegend=False),
                    row=2, col=1
                )
        
        # Group representation pie chart
        if protected_groups:
            first_attr = list(protected_groups.keys())[0]
            if 'distribution' in protected_groups[first_attr]:
                distribution = protected_groups[first_attr]['distribution']
                fig.add_trace(
                    go.Pie(
                        labels=list(distribution.keys()),
                        values=list(distribution.values()),
                        name="Group Distribution"
                    ),
                    row=1, col=2
                )
        
        # Overall fairness indicator
        overall_fairness = explanation_data.get('overall_fairness_score', 0.8)
        fig.add_trace(
            go.Indicator(
                mode="gauge+number+delta",
                value=overall_fairness,
                domain={'x': [0, 1], 'y': [0, 1]},
                title={'text': "Fairness Score"},
                gauge={
                    'axis': {'range': [None, 1]},
                    'bar': {'color': "darkblue"},
                    'steps': [
                        {'range': [0, 0.6], 'color': "lightgray"},
                        {'range': [0.6, 0.8], 'color': "yellow"},
                        {'range': [0.8, 1], 'color': "green"}
                    ],
                    'threshold': {
                        'line': {'color': "red", 'width': 4},
                        'thickness': 0.75,
                        'value': 0.8
                    }
                }
            ),
            row=2, col=2
        )
        
        # Update layout
        title = self._get_title('Comprehensive Fairness Analysis', stakeholder_type)
        fig.update_layout(
            title_text=title,
            font=dict(size=style_config['font_size']),
            template=self._get_plotly_template(style_config),
            height=800
        )
        
        return fig
    
    async def _create_decision_tree_viz(
        self,
        explanation_data: Dict[str, Any],
        stakeholder_type: str,
        style_config: Dict[str, Any],
        interactive: bool
    ) -> Dict[str, Any]:
        """
        Create decision tree visualization.
        
        Args:
            explanation_data: Decision tree data
            stakeholder_type: Target stakeholder
            style_config: Style configuration
            interactive: Whether to make interactive
            
        Returns:
            Visualization result
        """
        # Placeholder implementation for decision tree visualization
        # In practice, this would create a tree diagram
        return {
            'data': {
                'message': 'Decision tree visualization not yet implemented',
                'tree_data': explanation_data.get('tree_structure', {})
            },
            'type': 'data',
            'interactive_elements': {}
        }
    
    def _get_style_config(
        self,
        stakeholder_type: str,
        custom_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get style configuration for stakeholder type.
        
        Args:
            stakeholder_type: Target stakeholder
            custom_preferences: Custom style preferences
            
        Returns:
            Style configuration
        """
        base_config = self.stakeholder_styles.get(stakeholder_type, 
                                                  self.stakeholder_styles['end_user'])
        
        if custom_preferences:
            # Merge custom preferences
            config = base_config.copy()
            config.update(custom_preferences)
            return config
        
        return base_config
    
    def _get_max_features(self, stakeholder_type: str) -> int:
        """
        Get maximum number of features to show for stakeholder type.
        
        Args:
            stakeholder_type: Target stakeholder
            
        Returns:
            Maximum number of features
        """
        limits = {
            'end_user': 5,
            'business_user': 10,
            'technical_user': 20
        }
        return limits.get(stakeholder_type, 10)
    
    def _get_title(self, base_title: str, stakeholder_type: str) -> str:
        """
        Get appropriate title for stakeholder type.
        
        Args:
            base_title: Base title
            stakeholder_type: Target stakeholder
            
        Returns:
            Formatted title
        """
        if stakeholder_type == 'end_user':
            friendly_titles = {
                'Feature Importance': 'What Influenced This Decision?',
                'Prediction Explanation': 'How We Reached This Conclusion',
                'Recommended Changes': 'Ways to Improve Your Outcome',
                'Fairness Analysis': 'Ensuring Fair Treatment'
            }
            return friendly_titles.get(base_title, base_title)
        
        elif stakeholder_type == 'business_user':
            business_titles = {
                'Feature Importance': 'Key Business Drivers',
                'Prediction Explanation': 'Decision Factors Analysis',
                'Recommended Changes': 'Actionable Business Insights',
                'Fairness Analysis': 'Compliance & Risk Assessment'
            }
            return business_titles.get(base_title, base_title)
        
        return base_title  # Technical users get standard titles
    
    def _get_colors(self, n_colors: int, style_config: Dict[str, Any]) -> List[str]:
        """
        Get color palette for visualization.
        
        Args:
            n_colors: Number of colors needed
            style_config: Style configuration
            
        Returns:
            List of color codes
        """
        color_scheme = style_config.get('color_scheme', 'friendly')
        
        palettes = {
            'friendly': ['#FF9999', '#66B2FF', '#99FF99', '#FFCC99', '#FF99CC'],
            'professional': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
            'corporate': ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600']
        }
        
        palette = palettes.get(color_scheme, palettes['friendly'])
        
        # Extend palette if needed
        while len(palette) < n_colors:
            palette.extend(palette)
        
        return palette[:n_colors]
    
    def _get_plotly_template(self, style_config: Dict[str, Any]) -> str:
        """
        Get Plotly template for style.
        
        Args:
            style_config: Style configuration
            
        Returns:
            Template name
        """
        color_scheme = style_config.get('color_scheme', 'friendly')
        
        templates = {
            'friendly': 'plotly_white',
            'professional': 'plotly',
            'corporate': 'plotly_dark'
        }
        
        return templates.get(color_scheme, 'plotly_white')
    
    def _get_content_type(self, export_format: str) -> str:
        """
        Get content type for export format.
        
        Args:
            export_format: Export format
            
        Returns:
            Content type
        """
        content_types = {
            'html': 'text/html',
            'png': 'image/png',
            'svg': 'image/svg+xml',
            'json': 'application/json'
        }
        return content_types.get(export_format, 'text/html')
    
    async def _export_visualization(
        self,
        viz_result: Dict[str, Any],
        export_format: str,
        style_config: Dict[str, Any]
    ) -> str:
        """
        Export visualization to specified format.
        
        Args:
            viz_result: Visualization result
            export_format: Target format
            style_config: Style configuration
            
        Returns:
            Exported content
        """
        try:
            if viz_result['type'] == 'plotly' and self.plotly_available:
                fig = viz_result['figure']
                
                if export_format == 'html':
                    return fig.to_html(include_plotlyjs='cdn')
                elif export_format == 'png':
                    img_bytes = fig.to_image(format="png", width=1200, height=800)
                    return base64.b64encode(img_bytes).decode()
                elif export_format == 'svg':
                    svg_str = fig.to_image(format="svg", width=1200, height=800)
                    return base64.b64encode(svg_str).decode()
                elif export_format == 'json':
                    return fig.to_json()
                    
            elif viz_result['type'] == 'matplotlib' and self.matplotlib_available:
                fig = viz_result['figure']
                
                if export_format == 'html':
                    # Convert matplotlib to base64 and embed in HTML
                    buffer = io.BytesIO()
                    fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
                    buffer.seek(0)
                    img_base64 = base64.b64encode(buffer.getvalue()).decode()
                    plt.close(fig)
                    
                    html_template = f"""
                    <html>
                    <head><title>Visualization</title></head>
                    <body>
                        <div style="text-align: center;">
                            <img src="data:image/png;base64,{img_base64}" style="max-width: 100%; height: auto;">
                        </div>
                    </body>
                    </html>
                    """
                    return html_template
                    
                elif export_format == 'png':
                    buffer = io.BytesIO()
                    fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
                    buffer.seek(0)
                    img_base64 = base64.b64encode(buffer.getvalue()).decode()
                    plt.close(fig)
                    return img_base64
                    
            elif viz_result['type'] == 'data':
                if export_format == 'json':
                    return json.dumps(viz_result['data'], indent=2)
                else:
                    # Simple HTML representation
                    data = viz_result['data']
                    html_content = f"<h2>{data.get('title', 'Visualization')}</h2>"
                    html_content += f"<pre>{json.dumps(data, indent=2)}</pre>"
                    return html_content
            
            # Fallback
            return json.dumps(viz_result, indent=2)
            
        except Exception as e:
            logger.error(f"Error exporting visualization: {str(e)}")
            return f"Error exporting visualization: {str(e)}"
    
    def _summarize_fairness_metrics(self, fairness_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Summarize fairness metrics for simple display.
        
        Args:
            fairness_metrics: Fairness metrics data
            
        Returns:
            Summarized metrics
        """
        summary = {}
        
        for attr, metrics in fairness_metrics.items():
            attr_summary = {}
            
            if 'max_demographic_parity_difference' in metrics:
                diff = metrics['max_demographic_parity_difference']
                attr_summary['demographic_parity'] = {
                    'difference': diff,
                    'status': 'fair' if diff < 0.1 else 'biased'
                }
            
            if 'group_statistics' in metrics:
                group_stats = metrics['group_statistics']
                attr_summary['group_count'] = len(group_stats)
                attr_summary['prediction_rates'] = {
                    group: stats['positive_prediction_rate']
                    for group, stats in group_stats.items()
                }
            
            summary[attr] = attr_summary
        
        return summary
    
    async def create_dashboard(
        self,
        model_id: str,
        stakeholder_type: str,
        time_range: Optional[Dict[str, str]] = None,
        dashboard_type: str = 'overview'
    ) -> Dict[str, Any]:
        """
        Create stakeholder-specific dashboard.
        
        Args:
            model_id: Model identifier
            stakeholder_type: Target stakeholder
            time_range: Time range for dashboard data
            dashboard_type: Type of dashboard
            
        Returns:
            Dashboard result
        """
        dashboard_id = f"dashboard_{model_id}_{stakeholder_type}_{int(time.time())}"
        
        # Placeholder dashboard creation
        # In practice, this would aggregate data and create comprehensive dashboards
        dashboard_html = self._create_dashboard_html(
            model_id, stakeholder_type, dashboard_type
        )
        
        result = {
            'dashboard_id': dashboard_id,
            'model_id': model_id,
            'stakeholder_type': stakeholder_type,
            'dashboard_type': dashboard_type,
            'html_content': dashboard_html,
            'created_at': datetime.now().isoformat()
        }
        
        self.dashboards[dashboard_id] = result
        
        return result
    
    def _create_dashboard_html(
        self,
        model_id: str,
        stakeholder_type: str,
        dashboard_type: str
    ) -> str:
        """
        Create HTML dashboard content.
        
        Args:
            model_id: Model identifier
            stakeholder_type: Target stakeholder
            dashboard_type: Dashboard type
            
        Returns:
            HTML content
        """
        title = f"{dashboard_type.title()} Dashboard - Model {model_id}"
        
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .dashboard-header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .dashboard-content {{ margin-top: 20px; }}
                .placeholder {{ 
                    background-color: #e9ecef; 
                    border: 2px dashed #adb5bd; 
                    padding: 40px; 
                    text-align: center; 
                    margin: 20px 0;
                    border-radius: 5px;
                }}
            </style>
        </head>
        <body>
            <div class="dashboard-header">
                <h1>{title}</h1>
                <p>Stakeholder: {stakeholder_type.replace('_', ' ').title()}</p>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="dashboard-content">
                <div class="placeholder">
                    <h3>Model Performance Overview</h3>
                    <p>Performance metrics and trends would be displayed here.</p>
                </div>
                
                <div class="placeholder">
                    <h3>Explanation Analytics</h3>
                    <p>Explanation usage and effectiveness metrics would be shown here.</p>
                </div>
                
                <div class="placeholder">
                    <h3>Fairness Monitoring</h3>
                    <p>Bias detection and fairness metrics would be displayed here.</p>
                </div>
                
                <div class="placeholder">
                    <h3>Compliance Status</h3>
                    <p>Regulatory compliance status and audit results would be shown here.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_template
    
    async def get_dashboard_html(self, dashboard_id: str) -> Optional[str]:
        """
        Get dashboard HTML by ID.
        
        Args:
            dashboard_id: Dashboard identifier
            
        Returns:
            HTML content or None if not found
        """
        dashboard = self.dashboards.get(dashboard_id)
        return dashboard['html_content'] if dashboard else None
    
    async def get_visualization(self, viz_id: str, format: str = "html") -> Optional[Dict[str, Any]]:
        """
        Get visualization by ID.
        
        Args:
            viz_id: Visualization identifier
            format: Desired format
            
        Returns:
            Visualization data or None if not found
        """
        return self.visualizations.get(viz_id)
    
    async def get_templates(self, stakeholder_type: str) -> Dict[str, Any]:
        """
        Get available visualization templates for stakeholder type.
        
        Args:
            stakeholder_type: Target stakeholder
            
        Returns:
            Available templates
        """
        templates = {
            'end_user': [
                {'type': 'feature_importance', 'title': 'What Influenced This Decision?', 'description': 'Simple chart showing key factors'},
                {'type': 'counterfactual', 'title': 'How to Improve', 'description': 'Actionable recommendations'}
            ],
            'technical_user': [
                {'type': 'feature_importance', 'title': 'Feature Importance Analysis', 'description': 'Detailed feature contribution analysis'},
                {'type': 'shap_waterfall', 'title': 'SHAP Waterfall Plot', 'description': 'Step-by-step prediction breakdown'},
                {'type': 'bias_report', 'title': 'Bias Analysis Report', 'description': 'Comprehensive fairness assessment'},
                {'type': 'decision_tree', 'title': 'Decision Path Visualization', 'description': 'Model decision tree exploration'}
            ],
            'business_user': [
                {'type': 'feature_importance', 'title': 'Business Driver Analysis', 'description': 'Key business factors and their impact'},
                {'type': 'bias_report', 'title': 'Compliance Dashboard', 'description': 'Regulatory compliance and risk assessment'},
                {'type': 'counterfactual', 'title': 'Business Scenarios', 'description': 'What-if analysis for business decisions'}
            ]
        }
        
        return {
            'stakeholder_type': stakeholder_type,
            'available_templates': templates.get(stakeholder_type, []),
            'style_options': self.stakeholder_styles.get(stakeholder_type, {})
        }
