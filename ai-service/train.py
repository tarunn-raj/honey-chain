# ai-service/train.py
from __future__ import annotations

import argparse
from pathlib import Path


CLASSES = ["HEALTHY", "VARROA_MITE", "AMERICAN_FOULBROOD", "CHALKBROOD"]


def train(data_dir: Path, output_path: Path, epochs: int) -> None:
    try:
        import tensorflow as tf
        from tensorflow.keras import layers
        from tensorflow.keras.applications import MobileNetV2
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
        from tensorflow.keras.preprocessing.image import ImageDataGenerator
    except ImportError as error:
        raise SystemExit("TensorFlow is required for training. Install requirements.txt first.") from error

    if not all((data_dir / class_name).is_dir() for class_name in CLASSES):
        raise SystemExit(f"ImageFolder dataset must contain: {', '.join(CLASSES)}")

    generator = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        validation_split=0.2,
        rotation_range=12,
        width_shift_range=0.1,
        height_shift_range=0.1,
        horizontal_flip=True,
    )
    train_data = generator.flow_from_directory(data_dir, classes=CLASSES, target_size=(224, 224), batch_size=32, class_mode="categorical", subset="training", seed=42)
    validation_data = generator.flow_from_directory(data_dir, classes=CLASSES, target_size=(224, 224), batch_size=32, class_mode="categorical", subset="validation", seed=42)

    base = MobileNetV2(include_top=False, weights="imagenet", input_shape=(224, 224, 3))
    base.trainable = False
    inputs = tf.keras.Input(shape=(224, 224, 3))
    features = base(inputs, training=False)
    features = layers.GlobalAveragePooling2D()(features)
    features = layers.Dropout(0.25)(features)
    outputs = layers.Dense(len(CLASSES), activation="softmax")(features)
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="categorical_crossentropy", metrics=["accuracy"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    callbacks = [EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True), ModelCheckpoint(output_path, monitor="val_accuracy", save_best_only=True)]
    model.fit(train_data, validation_data=validation_data, epochs=epochs, callbacks=callbacks)

    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5), loss="categorical_crossentropy", metrics=["accuracy"])
    model.fit(train_data, validation_data=validation_data, epochs=max(1, epochs // 2), callbacks=callbacks)
    model.save(output_path)
    print(f"Saved MobileNetV2 disease model to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune MobileNetV2 on a bee-frame ImageFolder dataset.")
    parser.add_argument("--data", type=Path, default=Path("data/disease"))
    parser.add_argument("--output", type=Path, default=Path("disease_model.h5"))
    parser.add_argument("--epochs", type=int, default=8)
    arguments = parser.parse_args()
    train(arguments.data, arguments.output, arguments.epochs)
