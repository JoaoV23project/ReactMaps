// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, Card, FAB, Provider as PaperProvider, Text, TextInput } from 'react-native-paper';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  return (
    <View style={styles.centerContainer}>
      <Stack.Screen options={{headerShown: false}}/>
      <Text variant="displaySmall">Explorador</Text>
      <Button mode="contained" onPress={() => navigation.navigate('Map')}>
        Iniciar
      </Button>
    </View>
  );
} 


function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    getLocation();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMarkers();
    }, [])
  );

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  };

  const loadMarkers = async () => {
    try {
      const data = await AsyncStorage.getItem('@explorador_records');
      const parsed = JSON.parse(data || '[]');
      setMarkers(Array.isArray(parsed) ? parsed : []);
    } catch {
      setMarkers([]);
    }
  };

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <Text>Carregando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{headerShown: false}}/>
      <MapView
        style={styles.map}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
      >
        {(markers || []).map((m) => (
          <Marker
            key={m.id}
            coordinate={{
              latitude: Number(m.latitude),
              longitude: Number(m.longitude),
            }}
            title={m.description}
            onPress={() =>
              navigation.navigate('Details', { record: m })
            }
          />
        ))}
      </MapView>

      <FAB
        icon="camera"
        style={styles.fab}
        onPress={() => navigation.navigate('Camera', { location })}
      />
    </View>
  );
}

function CameraScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const location = route.params?.location;

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text>Permitir câmera</Text>
        <Button onPress={requestPermission}>OK</Button>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || !location) {
      Alert.alert('Erro ao acessar câmera ou localização');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync();

      navigation.navigate('SaveRecord', {
        photoUri: photo.uri,
        location,
      });
    } catch {
      Alert.alert('Erro ao tirar foto');
    }
  };

  return (
    <CameraView style={styles.camera} facing="back" ref={cameraRef}>
      <View style={styles.cameraButtonContainer}>
        <Button mode="contained" onPress={takePicture}>
          Capturar 📸
        </Button>
      </View>
    </CameraView>
  );
}

function SaveRecordScreen({ navigation, route }) {
  const { photoUri, location } = route.params;
  const [description, setDescription] = useState('');

  const save = async () => {
    if (!description.trim()) {
      Alert.alert('Digite uma descrição');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      photoUri,
      latitude: location.latitude,
      longitude: location.longitude,
      description,
      date: new Date().toLocaleDateString(),
    };

    try {
      const data = await AsyncStorage.getItem('@explorador_records');
      const list = JSON.parse(data || '[]');

      await AsyncStorage.setItem(
        '@explorador_records',
        JSON.stringify([...list, newItem])
      );

      navigation.goBack();
    } catch {
      Alert.alert('Erro ao salvar');
    }
  };

  return (
    <View style={styles.formContainer}>
      <Image source={{ uri: photoUri }} style={styles.previewImage} />

      <TextInput
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />

      <Button mode="contained" onPress={save}>
        Salvar
      </Button>
    </View>
  );
}


function DetailsScreen({ route }) {
  const { record } = route.params;

  return (
    <View style={styles.centerContainer}>
      <Card style={styles.card}>
        <Card.Cover source={{ uri: record.photoUri }} />
        <Card.Content>
          <Text>{record.description}</Text>
          <Text>
            📍 {record.latitude.toFixed(6)} | {record.longitude.toFixed(6)}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}


// APP
export default function App() {
  return (
    <PaperProvider>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="Camera" component={CameraScreen} />
          <Stack.Screen name="SaveRecord" component={SaveRecordScreen} />
          <Stack.Screen name="Details" component={DetailsScreen} />
        </Stack.Navigator>
    </PaperProvider>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formContainer: { flex: 1, padding: 20 },
  map: { width: '100%', height: '100%' },
  fab: { position: 'absolute', right: 20, bottom: 20 },
  camera: { flex: 1 },
  cameraButtonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 30,
  },
  previewImage: { width: '100%', height: 300, marginBottom: 20 },
  input: { marginBottom: 20 },
  card: { width: '90%' },
});