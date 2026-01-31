import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import pickle
import os
from datetime import datetime, timedelta

class WaterPredictor:
    """Modelo de Red Neuronal Multicapa para predecir niveles de agua"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_path = "data/trained_model.pkl"
        
        # ✅ INTENTAR CARGAR MODELO EXISTENTE AUTOMÁTICAMENTE
        self.load_model()
    
    def create_model(self):
        """Crear y configurar el modelo MLP"""
        self.model = MLPRegressor(
            hidden_layer_sizes=(64, 32, 16),  # 3 capas ocultas
            activation='relu',
            solver='adam',
            learning_rate='adaptive',
            max_iter=1000,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.2
        )
        print("✅ Modelo MLP creado con arquitectura: 64-32-16")
    
    def generate_training_data(self, conn):
        """Generar datos de entrenamiento sintéticos basados en patrones realistas"""
        # En una implementación real, esto vendría de la base de datos
        # Por ahora generamos datos sintéticos para demostración
        
        np.random.seed(42)
        n_samples = 1000
        
        # Características (features)
        data = {
            'consumo_historico': np.random.normal(400, 100, n_samples),  # Consumo histórico
            'nivel_actual': np.random.uniform(10, 95, n_samples),        # Nivel actual
            'dias_sin_lluvia': np.random.randint(0, 30, n_samples),      # Días sin lluvia
            'temperatura_promedio': np.random.normal(25, 5, n_samples),  # Temperatura
            'dia_semana': np.random.randint(0, 7, n_samples),            # Día de la semana
            'es_fin_semana': np.random.choice([0, 1], n_samples),        # Es fin de semana
            'entregas_recientes': np.random.poisson(2, n_samples),       # Entregas recientes
        }
        
        df = pd.DataFrame(data)
        
        # Target: consumo futuro (basado en características con ruido)
        # Fórmula que simula relaciones reales
        df['consumo_futuro'] = (
            df['consumo_historico'] * 0.6 +
            (100 - df['nivel_actual']) * 2 +  # Mayor consumo cuando niveles bajos
            df['dias_sin_lluvia'] * 1.5 +     # Más consumo en sequía
            df['temperatura_promedio'] * 3 +  # Más consumo con calor
            df['es_fin_semana'] * 20 +        # Más consumo en fines de semana
            np.random.normal(0, 20, n_samples)  # Ruido
        )
        
        return df
    
    def prepare_features(self, df):
        """Preparar características para el modelo"""
        # Seleccionar features y target
        feature_columns = [
            'consumo_historico', 'nivel_actual', 'dias_sin_lluvia',
            'temperatura_promedio', 'dia_semana', 'es_fin_semana', 
            'entregas_recientes'
        ]
        
        X = df[feature_columns]
        y = df['consumo_futuro']
        
        return X, y
    
    def train(self, conn):
        """Entrenar el modelo con datos de la base de datos"""
        if self.model is None:
            self.create_model()
        
        print("🔄 Generando datos de entrenamiento...")
        df = self.generate_training_data(conn)
        
        print("🔄 Preparando características...")
        X, y = self.prepare_features(df)
        
        # Dividir datos
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Escalar características
        print("🔄 Escalando características...")
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Entrenar modelo
        print("🔄 Entrenando modelo MLP...")
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluar modelo
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        self.is_trained = True
        
        print(f"✅ Modelo entrenado - Score entrenamiento: {train_score:.3f}")
        print(f"✅ Modelo entrenado - Score prueba: {test_score:.3f}")
        
        # Guardar modelo
        self.save_model()
        
        return {
            "train_score": round(train_score, 3),
            "test_score": round(test_score, 3),
            "samples_used": len(df),
            "training_date": datetime.now().isoformat()
        }
    
    def predict(self, features_dict):
        """Hacer predicción con el modelo entrenado"""
        if not self.is_trained:
            # ✅ INTENTAR CARGAR MODELO ANTES DE PREDECIR
            if not self.load_model():
                raise ValueError("Modelo no entrenado. Llama a train() primero.")
        
        # Convertir a DataFrame
        features_df = pd.DataFrame([features_dict])
        
        # Escalar características
        features_scaled = self.scaler.transform(features_df)
        
        # Hacer predicción
        prediction = self.model.predict(features_scaled)[0]
        
        return {
            "predicted_consumption": round(prediction, 2),
            "confidence": self._calculate_confidence(prediction),
            "timestamp": datetime.now().isoformat()
        }
    
    def _calculate_confidence(self, prediction):
        """Calcular confianza basada en la predicción (simplificado)"""
        # En una implementación real, usaríamos probabilidades del modelo
        if prediction < 200:
            return 0.95  # Alta confianza para consumos bajos
        elif prediction < 500:
            return 0.85  # Media confianza para consumos moderados
        else:
            return 0.75  # Menor confianza para consumos altos
    
    def save_model(self):
        """Guardar modelo entrenado"""
        if not os.path.exists("data"):
            os.makedirs("data")
        
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'is_trained': self.is_trained,
                'trained_date': datetime.now()
            }, f)
        print(f"✅ Modelo guardado en {self.model_path}")
    
    def load_model(self):
        """Cargar modelo entrenado"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    saved_data = pickle.load(f)
                
                self.model = saved_data['model']
                self.scaler = saved_data['scaler']
                self.is_trained = saved_data['is_trained']
                print("✅ Modelo cargado desde archivo")
                return True
            except Exception as e:
                print(f"❌ Error cargando modelo: {e}")
                return False
        else:
            print("ℹ️ No se encontró modelo guardado")
            return False

def ensure_trained(conn):
    """Asegurar que el modelo esté entrenado - Cargar o entrenar"""
    # Primero intentar cargar modelo existente
    if water_predictor.load_model():
        return {"status": "loaded_existing", "message": "Modelo cargado desde archivo"}
    
    # Si no existe, entrenar nuevo modelo
    print("🔄 Modelo no encontrado - Entrenando nuevo modelo...")
    result = water_predictor.train(conn)
    return {"status": "newly_trained", "message": "Modelo entrenado exitosamente", "results": result}

# Instancia global del predictor
water_predictor = WaterPredictor()