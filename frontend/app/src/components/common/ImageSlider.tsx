import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageSliderProps {
  images: string[];
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  if (!images || images.length === 0) {
    return (
        <div className="h-48 w-full bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">لا توجد صورة</span>
        </div>
    );
  }
  
  if (images.length === 1) {
      return (
          <div className="h-48 w-full bg-gray-200 rounded-lg overflow-hidden">
              <img src={images[0]} alt="Menu item" className="w-full h-full object-cover"/>
          </div>
      );
  }

  return (
    <div className="h-48 w-full relative group">
      <AnimatePresence initial={false}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover rounded-lg"
        />
      </AnimatePresence>
      <div className="absolute top-1/2 -translate-y-1/2 left-2 cursor-pointer bg-black bg-opacity-30 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={goToPrevious}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-2 cursor-pointer bg-black bg-opacity-30 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={goToNext}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </div>
    </div>
  );
};

export default ImageSlider;