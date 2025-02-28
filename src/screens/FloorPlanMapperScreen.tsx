import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BuildingPlan, Floor, AccessibilityFeature, Coordinate, FeatureType } from '../types';
import {
  getBuildingPlanById,
  getFloorById,
  setFloorImageDimensions,
  floorPositionToCoordinate,
  addAccessibilityFeature
} from '../services/floorPlanService';

// Add this screen to your RootStackParamList in AppNavigator.tsx:
// FloorPlanMapper: { buildingId: string, floorId: string };

type FloorPlanMapperScreenProps = {
  // We'll use hooks instead of props
};

const FloorPlanMapperScreen: React.FC<FloorPlanMapperScreenProps> = () => {
  // Use navigation and route hooks
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FloorPlanMapper'>>();
  
  // Extract params
  const { buildingId, floorId } = route.params;

  // State
  const [building, setBuilding] = useState<BuildingPlan | undefined>();
  const [floor, setFloor] = useState<Floor | undefined>();
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [markedPoints, setMarkedPoints] = useState<Array<{
    id: string;
    x: number;
    y: number;
    type: FeatureType;
    title: string;
    description: string;
    coordinate?: Coordinate;
  }>>([]);
  const [selectedType, setSelectedType] = useState<FeatureType>('elevator');
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Load building and floor data
  useEffect(() => {
    const loadBuildingAndFloor = () => {
      const buildingData = getBuildingPlanById(buildingId);
      if (buildingData) {
        setBuilding(buildingData);
        const floorData = getFloorById(buildingId, floorId);
        if (floorData) {
          setFloor(floorData);
        } else {
          Alert.alert('Error', 'Floor not found');
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', 'Building not found');
        navigation.goBack();
      }
    };

    loadBuildingAndFloor();
  }, [buildingId, floorId]);

  // Load floor plan image and its dimensions
  useEffect(() => {
    if (floor) {
      setIsLoading(true);
      
      // Determine if the floor plan URI is a string or a require() asset
      if (typeof floor.floorPlanUri === 'string') {
        // URI string case
        Image.getSize(
          floor.floorPlanUri,
          (width, height) => {
            console.log(`Floor plan image dimensions: ${width}x${height}`);
            handleImageLoaded(width, height);
          },
          (error) => {
            console.error('Error loading floor plan image:', error);
            // Use default dimensions as fallback
            handleImageLoaded(1000, 800);
            Alert.alert('Warning', 'Could not load floor plan dimensions');
          }
        );
      } else if (typeof floor.floorPlanUri === 'number') {
        // Required module ID case (local asset)
        try {
          const { width, height } = Image.resolveAssetSource(floor.floorPlanUri);
          console.log(`Floor plan image dimensions (local): ${width}x${height}`);
          handleImageLoaded(width, height);
        } catch (error) {
          console.error('Error resolving asset dimensions:', error);
          // Use default dimensions as fallback
          handleImageLoaded(1000, 800);
          Alert.alert('Warning', 'Could not load floor plan dimensions');
        }
      } else {
        // Fallback for other cases
        handleImageLoaded(1000, 800);
        Alert.alert('Warning', 'Unknown floor plan format');
      }
    }
  }, [floor]);

  // Handle image dimensions loaded
  const handleImageLoaded = (width: number, height: number) => {
    // Calculate scaled dimensions to fit the screen
    const screenWidth = Dimensions.get('window').width - 32; // Padding
    const scaleFactor = screenWidth / width;
    const scaledHeight = height * scaleFactor;
    
    setImageSize({
      width: screenWidth,
      height: scaledHeight
    });
    
    // Also store the original dimensions in the floor plan service
    if (floor) {
      setFloorImageDimensions(floor.id, { width, height });
    }
    
    setIsLoading(false);
  };

  // Handle image tap to mark a point
  const handleImageTap = (event: any) => {
    if (isLoading || !floor || !building) return;
    
    // Get the tap coordinates relative to the image
    const { locationX, locationY } = event.nativeEvent;
    
    // Scale coordinates back to original image size if necessary
    const screenWidth = Dimensions.get('window').width - 32;
    const originalWidth = imageSize.width / (screenWidth / imageSize.width);
    const originalHeight = imageSize.height / (screenWidth / imageSize.width);
    
    const scaledX = Math.round(locationX * (originalWidth / imageSize.width));
    const scaledY = Math.round(locationY * (originalHeight / imageSize.height));
    
    // Generate a unique ID for this point
    const pointId = `point-${Date.now()}`;
    
    // Create a new marked point
    const newPoint = {
      id: pointId,
      x: scaledX,
      y: scaledY,
      type: selectedType,
      title: `New ${selectedType}`,
      description: `Description for ${selectedType}`
    };
    
    // Add to marked points
    setMarkedPoints([...markedPoints, newPoint]);
    
    // Select this point for editing
    setSelectedPoint(pointId);
    setFeatureTitle(newPoint.title);
    setFeatureDescription(newPoint.description);
    setShowModal(true);
  };

  // Save the marked feature
  const handleSaveFeature = () => {
    if (!selectedPoint || !floor || !building) return;
    
    // Find the selected point
    const pointIndex = markedPoints.findIndex(p => p.id === selectedPoint);
    if (pointIndex === -1) return;
    
    // Update the point with title and description
    const updatedPoints = [...markedPoints];
    updatedPoints[pointIndex] = {
      ...updatedPoints[pointIndex],
      title: featureTitle,
      description: featureDescription
    };
    
    // Convert pixel position to coordinate
    const position = {
      buildingId: building.id,
      floorId: floor.id,
      x: updatedPoints[pointIndex].x,
      y: updatedPoints[pointIndex].y
    };
    
    const coordinate = floorPositionToCoordinate(position);
    
    if (coordinate) {
      updatedPoints[pointIndex].coordinate = coordinate;
      
      // Add the feature to the floor
      addAccessibilityFeature(
        {
          type: updatedPoints[pointIndex].type,
          title: updatedPoints[pointIndex].title,
          description: updatedPoints[pointIndex].description,
          coordinate
        },
        building.id,
        floor.id
      );
      
      console.log('Added feature:', {
        type: updatedPoints[pointIndex].type,
        title: updatedPoints[pointIndex].title,
        description: updatedPoints[pointIndex].description,
        coordinate
      });
    }
    
    setMarkedPoints(updatedPoints);
    setShowModal(false);
    setSelectedPoint(null);
  };

  // Export the marked features as JSON
  const handleExportFeatures = () => {
    const features = markedPoints.filter(p => p.coordinate).map(p => ({
      id: p.id,
      type: p.type,
      title: p.title,
      description: p.description,
      coordinate: p.coordinate
    }));
    
    console.log('Exported features:', JSON.stringify(features, null, 2));
    
    Alert.alert(
      'Features Exported',
      `${features.length} features have been exported to the console. You can copy the JSON from there.`
    );
  };

  // Render feature markers
  const renderMarkers = () => {
    return markedPoints.map(point => (
      <TouchableOpacity
        key={point.id}
        style={[
          styles.marker,
          { 
            left: point.x * (imageSize.width / originalImageWidth()), 
            top: point.y * (imageSize.height / originalImageHeight()) 
          },
          selectedPoint === point.id && styles.selectedMarker
        ]}
        onPress={() => {
          setSelectedPoint(point.id);
          setFeatureTitle(point.title);
          setFeatureDescription(point.description);
          setSelectedType(point.type);
          setShowModal(true);
        }}
      >
        <Text style={styles.markerText}>{getIconForType(point.type)}</Text>
      </TouchableOpacity>
    ));
  };

  // Helper to calculate original image width
  const originalImageWidth = () => {
    if (!floor) return 1000;
    const screenWidth = Dimensions.get('window').width - 32;
    return imageSize.width / (screenWidth / imageSize.width);
  };

  // Helper to calculate original image height
  const originalImageHeight = () => {
    if (!floor) return 800;
    const screenWidth = Dimensions.get('window').width - 32;
    return imageSize.height / (screenWidth / imageSize.width);
  };

  // Get icon for feature type
  const getIconForType = (type: FeatureType): string => {
    switch (type) {
      case 'elevator': return '🔼';
      case 'restroom': return '🚻';
      case 'ramp': return '♿';
      case 'entrance': return '🚪';
      case 'parking': return '🅿️';
      default: return 'ℹ️';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Floor Plan Mapper</Text>
        <Text style={styles.headerSubtitle}>
          {building?.name} - {floor?.name}
        </Text>
      </View>
      
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.toolButton, selectedType === 'elevator' && styles.selectedToolButton]}
            onPress={() => setSelectedType('elevator')}
          >
            <Text style={styles.toolButtonText}>🔼 Elevator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, selectedType === 'restroom' && styles.selectedToolButton]}
            onPress={() => setSelectedType('restroom')}
          >
            <Text style={styles.toolButtonText}>🚻 Restroom</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, selectedType === 'ramp' && styles.selectedToolButton]}
            onPress={() => setSelectedType('ramp')}
          >
            <Text style={styles.toolButtonText}>♿ Ramp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, selectedType === 'entrance' && styles.selectedToolButton]}
            onPress={() => setSelectedType('entrance')}
          >
            <Text style={styles.toolButtonText}>🚪 Entrance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, selectedType === 'parking' && styles.selectedToolButton]}
            onPress={() => setSelectedType('parking')}
          >
            <Text style={styles.toolButtonText}>🅿️ Parking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, selectedType === 'other' && styles.selectedToolButton]}
            onPress={() => setSelectedType('other')}
          >
            <Text style={styles.toolButtonText}>ℹ️ Other</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading floor plan...</Text>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleImageTap}
            >
              {floor && (
                <Image
                  source={typeof floor.floorPlanUri === 'string' 
                    ? { uri: floor.floorPlanUri } 
                    : floor.floorPlanUri}
                  style={{
                    width: imageSize.width,
                    height: imageSize.height,
                    resizeMode: 'contain'
                  }}
                />
              )}
              
              {/* Render markers */}
              {renderMarkers()}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* Feature info modal */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Feature Information</Text>
            
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.typeButton, selectedType === 'elevator' && styles.selectedTypeButton]}
                  onPress={() => setSelectedType('elevator')}
                >
                  <Text style={styles.typeButtonText}>🔼 Elevator</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, selectedType === 'restroom' && styles.selectedTypeButton]}
                  onPress={() => setSelectedType('restroom')}
                >
                  <Text style={styles.typeButtonText}>🚻 Restroom</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, selectedType === 'ramp' && styles.selectedTypeButton]}
                  onPress={() => setSelectedType('ramp')}
                >
                  <Text style={styles.typeButtonText}>♿ Ramp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, selectedType === 'entrance' && styles.selectedTypeButton]}
                  onPress={() => setSelectedType('entrance')}
                >
                  <Text style={styles.typeButtonText}>🚪 Entrance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, selectedType === 'parking' && styles.selectedTypeButton]}
                  onPress={() => setSelectedType('parking')}
                >
                  <Text style={styles.typeButtonText}>🅿️ Parking</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, selectedType === 'other' && styles.selectedTypeButton]}
                  onPress={() => setSelectedType('other')}
                >
                  <Text style={styles.typeButtonText}>ℹ️ Other</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={featureTitle}
              onChangeText={setFeatureTitle}
              placeholder="Feature title"
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={featureDescription}
              onChangeText={setFeatureDescription}
              placeholder="Feature description"
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowModal(false);
                  
                  // If this was a new point and user cancels, remove it
                  if (selectedPoint) {
                    const pointExists = markedPoints.some(p => p.id === selectedPoint);
                    if (pointExists) {
                      const selectedPointData = markedPoints.find(p => p.id === selectedPoint);
                      if (!selectedPointData?.coordinate) {
                        setMarkedPoints(markedPoints.filter(p => p.id !== selectedPoint));
                      }
                    }
                  }
                  
                  setSelectedPoint(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveFeature}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            Alert.alert(
              'Clear All Points',
              'Are you sure you want to clear all marked points?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Clear', 
                  onPress: () => setMarkedPoints([]),
                  style: 'destructive' 
                }
              ]
            );
          }}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportFeatures}
        >
          <Text style={styles.exportButtonText}>Export Features</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  header: {
    padding: 16,
    backgroundColor: '#4A80F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  toolbar: {
    padding: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  toolButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  selectedToolButton: {
    backgroundColor: '#4A80F0',
  },
  toolButtonText: {
    fontSize: 14,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 128, 240, 0.8)',
    borderWidth: 1,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  selectedMarker: {
    backgroundColor: 'rgba(255, 140, 0, 0.8)',
    borderColor: '#FFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    transform: [{ translateX: -14 }, { translateY: -14 }],
  },
  markerText: {
    fontSize: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginRight: 8,
  },
  selectedTypeButton: {
    backgroundColor: '#4A80F0',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#666',
  },
  modalSaveButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  modalSaveButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  exportButton: {
    flex: 2,
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default FloorPlanMapperScreen;